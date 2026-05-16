# Security Specification - Multi-Tenant Field Service OS

## Data Invariants
1. **User Ownership**: A user can only read and write their own profile document (`/users/{userId}`).
2. **Tenant Access**: Access to a tenant's data is granted only if the user has an active membership in that tenant.
3. **Invitation Constraints**: Only tenant admins or owners can create invitations. A user can only see invitations sent to their email.
4. **Hierarchical Permissions**: 
   - `Owner`: Full access to tenant data and memberships.
   - `Admin`: Can manage project and staff, but not view financial vaults (unless specifically assigned).
   - `User`: Can only see projects they are assigned to.

## The "Dirty Dozen" Payloads

1. **Identity Theft**: Attempting to create a user profile with a different `userId`.
2. **Elevated Privileges**: Attempting to set `roleId: 'owner'` in a `TenantMembership` via the client.
3. **Ghost Tenant**: Attempting to create a tenant without a valid NIP or name.
4. **Member Scraping**: Attempting to list all users in the system from an unauthenticated session.
5. **Invitation Spoofing**: Attempting to accept an invitation intended for another email.
6. **Project Breach**: Attempting to read `/projects/{projectId}` without being a member.
7. **Time Log Forgery**: Attempting to log time for another user.
8. **Audit Log Erasure**: Attempting to delete an `/auditLogs/{logId}` entry.
9. **Financial Peek**: Attempting to read `/financialTransactions` without specific financial role.
10. **Resource Poisoning**: Attempting to inject 2MB of junk into the `settings` field of a tenant.
11. **Shadow Update**: Attempting to update a user's `email` (immutable).
12. **Orphaned Writes**: Attempting to create a `Project` with a `tenantId` that doesn't exist.

## Test Runner (Draft)
The tests will verify that all the above unauthorized operations return `PERMISSION_DENIED`.
