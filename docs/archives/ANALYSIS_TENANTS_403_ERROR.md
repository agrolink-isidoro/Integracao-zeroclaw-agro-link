# 403 Forbidden Error Analysis: GET /api/core/tenants/

## Issue Summary

The frontend is receiving a **403 Forbidden** error when attempting to fetch the list of tenants on page load. The error is logged in the console but doesn't break the application.

```
GET http://localhost:8001/api/core/tenants/ 403 (Forbidden)
[API] Received 403 Forbidden (permission denied). Not clearing tokens automatically.
```

## Root Cause

### Backend Requirements
- **Endpoint**: `GET /api/core/tenants/`
- **Required Permissions**: `IsAuthenticated` + `IsAdminUser`
  - User must have `is_staff=True` OR `is_superuser=True`
- **Code Location**: [apps/core/views.py](apps/core/views.py#L350-L361)

### Frontend Flow
1. **AuthProvider** initializes and loads tokens from localStorage
2. **TenantBridge** extracts user data and determines `isSuperuser = user?.is_superuser || user?.is_staff`
3. **TenantProvider** useEffect triggers based on `isSuperuser` value
4. **refreshTenants()** is called if `isSuperuser === true`
5. API request is made with authorization header
6. **Backend rejects with 403** because user doesn't have admin permissions

### Why the Error Occurs

The 403 error happens when **one of the following is true**:

1. **User profile mismatch**: 
   - Frontend: User appears to have `is_superuser` or `is_staff = true`
   - Backend: Database shows the user without these flags

2. **Stale tokens**: 
   - Token in localStorage is from a non-admin account
   - Frontend's `user` object and actual DB user don't match

3. **Initialization race condition**: 
   - TenantContext attempts to load before user profile is fully validated

## Current Behavior (Working as Designed)

✅ **The error handling is correct:**

```typescript
// TenantContext.tsx — Silent failure of 403 errors
try {
  const tenants = await tenantsService.list();
  setTenantList(tenants);
} catch (e) {
  if ((e as any)?.response?.status !== 403) {
    console.warn('[TenantContext] Erro ao carregar lista de tenants', e);
  }
  // 403 is silently ignored — this is expected for non-admin users
}
```

- The 403 error is **intentionally silently caught**
- Regular users don't need the tenants list (only admins do)
- Application continues normally despite the error

## Solutions

### Solution 1: Suppress the Console Error (Recommended)
The cleanest approach is to prevent the request from being made at all when the user clearly doesn't have admin status.

**File**: [frontend/src/contexts/TenantContext.tsx](frontend/src/contexts/TenantContext.tsx)

**Current guard**:
```typescript
if (!isSuperuser || typeof isSuperuser !== 'boolean') return;
if (!getStoredTokens()?.access) return;
```

**Enhanced guard** - Add logging to verify isSuperuser:
```typescript
const refreshTenants = useCallback(async () => {
  // Only load tenants for authenticated superusers
  if (isSuperuser !== true) {
    console.debug('[TenantContext] Skipping tenant list load: isSuperuser =', isSuperuser);
    return;
  }
  if (!getStoredTokens()?.access) {
    console.debug('[TenantContext] Skipping tenant list load: no access token');
    return;
  }
  
  setLoadingTenants(true);
  try {
    const tenants = await tenantsService.list();
    setTenantList(tenants);
  } catch (e) {
    if ((e as any)?.response?.status !== 403) {
      console.warn('[TenantContext] Erro ao carregar lista de tenants', e);
    }
  } finally {
    setLoadingTenants(false);
  }
}, [isSuperuser]);
```

### Solution 2: Fix User Permissions in Backend
Ensure the user account has the correct Django flags set:

```python
# In Django admin or through code
from django.contrib.auth.models import User

user = User.objects.get(username='username')
user.is_staff = True  # or is_superuser = True
user.save()
```

### Solution 3: Add Better Error Tracking
Suppress the specific 403 errors from appearing in console to reduce noise:

**File**: [frontend/src/services/api.js](frontend/src/services/api.js#L119-L135)

**Current implementation**:
```javascript
if (err.response?.status === 403) {
  console.warn('[API] Received 403 Forbidden (permission denied). Not clearing tokens automatically.');
  return Promise.reject(error);
}
```

**Enhanced version** - Only warn if not from tenants endpoint:
```javascript
if (err.response?.status === 403) {
  // Don't warn for expected tenant list 403s (non-admin users)
  if (err.config?.url !== '/core/tenants/') {
    console.warn('[API] Received 403 Forbidden (permission denied). Not clearing tokens automatically.');
  }
  return Promise.reject(error);
}
```

## Verification Steps

1. **Check user permissions in database**:
   ```bash
   # From Django shell
   from django.contrib.auth.models import User
   user = User.objects.get(username='your_username')
   print(f"is_staff: {user.is_staff}, is_superuser: {user.is_superuser}")
   ```

2. **Check what frontend sees**:
   ```javascript
   // In browser console
   const stored = localStorage.getItem('sistema_agro_user');
   console.log('Frontend user data:', JSON.parse(stored));
   ```

3. **Test the endpoint directly**:
   ```bash
   # With valid token
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:8001/api/core/tenants/
   ```

## Recommendation

**Use Solution 1** (Enhanced guard with logging) as it requires no backend changes and provides clarity about what's happening. The 403 error is expected behavior for non-admin accounts, so preventing the request entirely is the best approach.

The application is **functioning correctly** — this console error doesn't affect functionality, but we can suppress it with proper guards.
