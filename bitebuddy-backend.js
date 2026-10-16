/* BiteBuddy integration with your ORIGINAL Supabase groups/group_members/group_preferences schema.
 * Never place a service_role or secret key in browser code. */
(() => {
  'use strict';
  let client, userPromise;
  const GROUP_KEY = 'bitebuddyGroupId';
  const check = response => { if (response.error) throw response.error; return response.data; };

  function db() {
    if (!client) {
      const url = window.BITEBUDDY_SUPABASE_URL || '';
      const key = window.BITEBUDDY_SUPABASE_PUBLISHABLE_KEY || '';
      if (!url.startsWith('https://') || !url.includes('.supabase.co') ||
          !key || key.startsWith('PASTE_')) {
        throw new Error('Supabase is not configured. Add your Project URL and publishable key to supabase-config.js.');
      }
      if (!window.supabase?.createClient) {
        throw new Error('Supabase library could not load. Check your internet connection.');
      }
      client = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
    }
    return client;
  }

  async function user() {
    if (!userPromise) {
      userPromise = (async () => {
        const sdk = db();
        const {data, error} = await sdk.auth.getUser();
        if (error && !/session missing|auth session missing/i.test(error.message || '')) throw error;
        if (data?.user) return data.user;
        const result = await sdk.auth.signInAnonymously();
        if (result.error) throw new Error('Anonymous sign-in failed: ' + result.error.message +
          '. Enable Anonymous Sign-Ins under Supabase Authentication.');
        return result.data.user;
      })().catch(err => { userPromise = null; throw err; });
    }
    return userPromise;
  }

  function rememberGroup(group) {
    localStorage.setItem(GROUP_KEY, group.id);
    localStorage.setItem('bitebuddyGroupName', group.name);
    return group;
  }
  function groupId() { return localStorage.getItem(GROUP_KEY); }
  async function requireGroup() {
    await user();
    const id = groupId();
    if (!id) throw new Error('Create or join a BiteBuddy group first.');
    const group = check(await db().from('groups')
      .select('id,name,invite_code,group_size,expires_at')
      .eq('id', id).maybeSingle());
    if (!group) throw new Error('Group not accessible from this browser session. Rejoin with an invite code.');
    return rememberGroup({ ...group, max_members: group.group_size });
  }

  async function createGroup(name, groupSize, hostName = 'Host') {
    await user();
    const trimmed = String(hostName || '').trim() || 'Host';
    // Prefer your 3-parameter create RPC; fall back if only the original 2-param version exists.
    let response = await db().rpc('create_bitebuddy_group', {
      p_name: name, p_group_size: groupSize, p_host_name: trimmed
    });
    if (response.error && (response.error.code === 'PGRST202' ||
        /Could not find the function public\.create_bitebuddy_group/i.test(response.error.message || ''))) {
      response = await db().rpc('create_bitebuddy_group', {
        p_name: name, p_group_size: groupSize
      });
    }
    const rows = check(response);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.group_id || !row?.invite_code) throw new Error('Create-group RPC returned no group ID or invite code.');
    localStorage.setItem('bitebuddyGuestName', trimmed);
    return rememberGroup({
      id: row.group_id, name: name.trim(), invite_code: row.invite_code,
      group_size: groupSize, max_members: groupSize
    });
  }

  async function joinGroup(inviteCode, guestName) {
    await user();
    const name = String(guestName || '').trim();
    if (!name || name.length > 40) throw new Error('Enter your name (1–40 characters) before joining.');
    const rows = check(await db().rpc('join_bitebuddy_group', {
      p_invite_code: inviteCode, p_guest_name: name
    }));
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.group_id) throw new Error('Join-group RPC returned no group ID.');
    localStorage.setItem('bitebuddyGuestName', name);
    return rememberGroup({
      id: row.group_id, name: row.group_name, invite_code: inviteCode.trim().toUpperCase(),
      group_size: row.group_size, max_members: row.group_size, member_count: row.member_count
    });
  }

  async function savePreferences(data) {
    const group = await requireGroup();
    check(await db().rpc('save_bitebuddy_preferences', {
      p_group_id: group.id, p_preferences: data
    }));
    localStorage.setItem('bitebuddyPreferences', JSON.stringify(data));
    return true;
  }
  async function loadMyPreferences() {
    const group = await requireGroup();
    const me = await user();
    const row = check(await db().from('group_preferences')
      .select('preferences').eq('group_id', group.id)
      .eq('guest_id', me.id).maybeSingle());
    return row?.preferences || null;
  }
  async function groupPreferences() {
    const group = await requireGroup();
    const rows = check(await db().from('group_preferences')
      .select('guest_id,preferences').eq('group_id', group.id));
    return rows.map(row => ({ user_id: row.guest_id, data: row.preferences }));
  }
  async function groupMembers() {
    const group = await requireGroup();
    const rows = check(await db().from('group_members')
      .select('guest_id,guest_name').eq('group_id', group.id));
    return rows.map(row => ({ user_id: row.guest_id, name: row.guest_name }));
  }
  window.BiteBuddy = { db, user, groupId, requireGroup, createGroup, joinGroup,
    savePreferences, loadMyPreferences, groupPreferences, groupMembers };
})();
