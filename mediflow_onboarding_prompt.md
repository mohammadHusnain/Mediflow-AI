# MediFlow — Account Provisioning, Onboarding Flow & RBAC Fix
## Master Prompt · Frontend + Backend Requirements

Design system in force: Outfit (sans), JetBrains Mono (mono), brand #4338CA,
brandDark #352E9E, slate #5B6472, mist #F6F8F9, hairline #E4E8EB, canvas #FFFFFF,
text-slate-900 for primary text. All animation classes from existing tailwind.config.js.
No new external libraries. No placeholders. No TODOs.

---

---

# SECTION A — EMAIL COLLECTION & CREDENTIAL GENERATION

## A1. Email field — Doctor form (already exists, enforce properly)

In AddDoctor and EditDoctor forms, the `email` field already exists.
Enforce the following:

- **Required** — cannot submit without a valid email
- **Format validation**: standard email regex on blur
- **Helper text** always visible below the field:
  `Outfit 400 text-[11px] text-slate/60`
  "Login credentials will be sent to this email address."
- On edit: email field is **read-only** after the account is created
  (cannot change email — it is the username):
  ```jsx
  // In EditDoctor: if doctor already has an account (doctor.has_account === true)
  <input
    {...register('email')}
    readOnly={doctor.has_account}
    className={doctor.has_account
      ? 'bg-mist text-slate cursor-not-allowed ...'
      : '...normal styles...'
    }
  />
  // Show below: "Email cannot be changed after account creation."
  // in text-amber-600 text-[11px] if readOnly
  ```

## A2. Email field — Staff form (ADD THIS FIELD)

In AddStaff and EditStaff forms, add `email` to the Personal Details section:

| Field | Type | Validation | Position |
|---|---|---|---|
| Email | email | required, valid format | After phone field |

Same helper text as doctor: "Login credentials will be sent to this email address."
Same read-only behaviour on edit if `staff.has_account === true`.

Staff data contract update — add to StaffObject:
```js
email:       string,          // required on create
has_account: boolean,         // backend sets true after credentials sent
```

## A3. Credential generation — what the frontend communicates

The frontend does NOT generate credentials. It only collects the email.
On form submit, the backend handles everything. The frontend must:

1. Show a loading state on the submit button while creation is in progress
   (credential generation + email sending may take 1–2 seconds longer than
   a normal save — use the existing spinner-in-button pattern)

2. On success response: show a **Success Modal** (not just a toast) before
   navigating to the profile page:

```
┌────────────────────────────────────────────────────┐
│  ✓  Account Created Successfully                   │
│                                                    │
│  [Doctor/Staff]'s profile has been created and     │
│  login credentials have been sent to:              │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  📧  doctor@example.com        font-mono     │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  They will receive an email with their temporary   │
│  password and instructions to access the portal.   │
│                                                    │
│  [ View Profile ]                                  │
└────────────────────────────────────────────────────┘
```

**Success Modal spec:**
`max-w-sm bg-canvas rounded-card shadow-card p-6`

Header:
  lucide CheckCircle2 size-[22px] text-green-500 mr-2 inline-block
  "Account Created Successfully" Outfit 700 text-[18px] text-slate-900

Body:
  Outfit 400 text-[14px] text-slate mt-3 leading-relaxed:
  "[Full Name]'s profile has been created and login credentials have been sent to:"

Email display block:
  `bg-mist rounded-control px-4 py-2.5 flex items-center gap-2 mt-3`
  lucide Mail size-[14px] text-slate
  email in font-mono text-[14px] text-slate-900

Footer text:
  Outfit 400 text-[13px] text-slate mt-3:
  "They will receive an email with their temporary password and instructions
  to access the portal."

Single action:
  "View Profile" — brand solid button, full-width, mt-5
  → navigates to /doctors/:id or /staff/:id
  No X button, no cancel — user must click "View Profile" to proceed.
  Modal is not dismissable by clicking outside or pressing Escape.

3. On failure (email send failed, but profile created):
   Show a warning toast (amber):
   "Profile created but email delivery failed. Share credentials manually."
   Still navigate to the profile page after 2s.

4. On failure (profile creation failed):
   Standard rose error banner below the form — same as existing error handling.

---

# SECTION B — FIRST LOGIN: FORCED PASSWORD CHANGE

## B1. Auth flow update — detect force_password_change

After login, the API response includes:
```js
{
  access:                  string,
  refresh:                 string,
  role:                    string,
  full_name:               string,
  user_id:                 number,
  force_password_change:   boolean,   // NEW FIELD
}
```

In AuthContext `login()` function, after storing tokens and user data:
```js
// After storing tokens:
if (data.force_password_change) {
  navigate('/change-password', { replace: true })
} else {
  navigate(homePath(), { replace: true })
}
```

Also store this flag:
```js
localStorage.setItem('user', JSON.stringify({
  ...existingUserData,
  force_password_change: data.force_password_change,
}))
```

## B2. Route guard for forced password change

In App.jsx, add a new route:
```jsx
<Route path="/change-password" element={<ChangePassword />} />
```

This route is accessible even without full authentication (user has token but
force_password_change = true — they are partially authenticated).

Add a guard in ProtectedRoute: if user exists in context AND
`user.force_password_change === true` AND current path is NOT `/change-password`
→ redirect to `/change-password`.

```jsx
// In ProtectedRoute.jsx — add this check before rendering children:
if (user?.force_password_change && location.pathname !== '/change-password') {
  return <Navigate to="/change-password" replace />
}
```

This ensures: if a forced-change user tries to navigate anywhere in the portal
(sidebar links, direct URL, browser back) → they are always redirected back to
/change-password until the password is changed.

## B3. Change Password Page — src/pages/ChangePassword.jsx

**Layout:** Centered card on bg-mist (same as Login page right panel).
`max-w-md mx-auto bg-canvas rounded-card shadow-card p-8 animate-fade-up`

No sidebar, no topbar on this page — it renders OUTSIDE the main Layout shell
(add it as a standalone route, not nested inside the Layout wrapper in App.jsx).

**Content top to bottom:**

1. Logo: "MediFlow" Outfit 700 text-[20px] text-brand centered, mb-8

2. Icon block:
   `w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4`
   lucide KeyRound size-[26px] text-amber-500

3. "Set Your Password" Outfit 700 text-[24px] text-slate-900 text-center

4. Subtitle: "You're using a temporary password. Please create a new password
   to secure your account." Outfit 400 text-[14px] text-slate text-center mt-2

5. Form fields:
   ```
   New Password         [password input, show/hide toggle]
   Confirm New Password [password input, show/hide toggle]
   ```
   Same input styling as Login page.

   Password requirements (show as a live checklist below the New Password field,
   updating as the user types):
   ```
   ✓ At least 8 characters
   ✓ At least one uppercase letter
   ✓ At least one number
   ✓ At least one special character (!@#$%^&*)
   ```
   Each rule: flex items-center gap-2
   - Met: lucide Check size-[13px] text-green-500 + Outfit 400 text-[12px] text-green-600
   - Not met: lucide X size-[13px] text-slate/40 + Outfit 400 text-[12px] text-slate/60

   Confirm password: show match indicator on blur:
   - Match: "Passwords match" in text-green-600 text-[12px] lucide Check
   - No match: "Passwords do not match" in text-rose-500 text-[12px] lucide X

6. Submit button: "Set Password & Continue" — brand solid, full-width
   Disabled until all 4 password rules are met AND passwords match.
   Loading spinner while API call is in-flight.

7. Signed in as: `bg-mist rounded-control px-3 py-2 flex items-center gap-2 mt-4`
   lucide User size-[13px] text-slate
   Outfit 400 text-[12px] text-slate: "Signed in as " +
   font-mono text-[12px] text-slate-900: user's email
   — so they know which account they're setting the password for.

**On success:**
- Clear `force_password_change` from localStorage user object
- Update AuthContext user state: `user.force_password_change = false`
- Toast: "Password updated successfully. Welcome to MediFlow!"
- Navigate to `homePath()` (their role-specific dashboard)

**On failure:**
- Rose error banner below form (same pattern as other forms)
- Common errors: "Password too weak", "Passwords do not match" (backend validates too)

**Sign out link:**
Small "Sign out and use a different account" text link at bottom of card.
text-slate text-[12px] hover:text-brand — calls logout() and navigates to /login.

---

# SECTION C — RBAC PERMISSIONS UI FIX

## C1. Context

In the permissions/access control configuration UI (wherever role permissions
are displayed as a matrix or list with access level options), remove the
standalone **"Write"** option.

The three-option set:
```
No Access  |  Read  |  Write  |  Read & Write
```
is redundant because "Write" implies write-only which is not meaningful in
this system — you cannot write without being able to read what you wrote.
"Read & Write" already covers the full-access case.

## C2. Fix — reduce to two meaningful access levels

Replace the three/four option set with:
```
No Access  |  Read  |  Full Access
```

"Full Access" replaces "Read & Write" — clearer label, same meaning.
"Write" standalone option is removed entirely.

**Where to apply:**
- Any permissions matrix table (role × feature grid)
- Any access level dropdown or select in admin settings
- Any permission badge/chip displaying access level

**Visual treatment of the three levels:**

| Level | Chip style | Label |
|---|---|---|
| No Access | bg-slate-100 text-slate border-slate-200 | No Access |
| Read | bg-amber-50 text-amber-700 border-amber-200 | Read |
| Full Access | bg-green-50 text-green-700 border-green-200 | Full Access |

**Data mapping:** If backend stores "write" or "read_write" values, map on
the frontend:
```js
// src/lib/permissions.js — add mapping utility
export function normalizeAccessLevel(level) {
  if (level === 'write')      return 'full_access'   // treat old write as full
  if (level === 'read_write') return 'full_access'
  return level  // 'no_access' | 'read' | 'full_access' pass through
}

export const ACCESS_LEVELS = [
  { value: 'no_access',   label: 'No Access',   chipClass: 'bg-slate-100 text-slate border-slate-200'   },
  { value: 'read',        label: 'Read',         chipClass: 'bg-amber-50  text-amber-700 border-amber-200' },
  { value: 'full_access', label: 'Full Access',  chipClass: 'bg-green-50  text-green-700 border-green-200' },
]
```

Use `ACCESS_LEVELS` array to render permission dropdowns — never hardcode the
option labels inline.

---

# QA CHECKLIST

### Section A — Email & Credential Generation

**Doctor form:**
[ ] Email field present and required — blocking if empty
[ ] Invalid email format → "Please enter a valid email address" on blur
[ ] Helper text "Login credentials will be sent to this email" always visible
[ ] On EditDoctor when has_account=true → email field is read-only (greyed input)
[ ] Read-only email shows amber note "Email cannot be changed after account creation"

**Staff form:**
[ ] Email field added to Personal Details section, after phone
[ ] Same validation and helper text as doctor email field
[ ] Same read-only behaviour on edit when has_account=true

**Success modal:**
[ ] Modal appears after successful doctor creation — not just a toast
[ ] Modal appears after successful staff creation
[ ] Modal shows correct email address (from the just-submitted form)
[ ] "View Profile" navigates to /doctors/:id or /staff/:id correctly
[ ] Modal NOT dismissable by clicking outside or pressing Escape
[ ] No X button on modal
[ ] Warning toast shows if email delivery failed but profile created
[ ] Loading spinner on submit button while creation + email send is in-flight

### Section B — Forced Password Change

**Auth flow:**
[ ] Login response with force_password_change=true → redirects to /change-password
[ ] Login response with force_password_change=false → redirects to role dashboard normally
[ ] force_password_change stored in localStorage user object

**Route guard:**
[ ] User with force_password_change=true tries to navigate to /dashboard → redirected to /change-password
[ ] User with force_password_change=true types /patients in URL → redirected to /change-password
[ ] User with force_password_change=true presses browser back → stays on /change-password
[ ] After successful password change: navigating works normally (guard inactive)

**Change Password page:**
[ ] Page renders WITHOUT sidebar and topbar (standalone layout)
[ ] Logo "MediFlow" present
[ ] All 4 password requirement rules show as checklist
[ ] Each rule updates live as user types (not on blur)
[ ] Confirm password match indicator appears on blur
[ ] Submit button disabled until all rules met AND passwords match
[ ] "Signed in as" block shows correct email
[ ] On success: force_password_change cleared, navigated to correct dashboard
[ ] On failure: rose error banner shown, stay on page
[ ] "Sign out and use a different account" link calls logout() + navigates to /login

### Section C — RBAC Permissions Fix

[ ] No "Write" option exists anywhere in permissions UI
[ ] Three options only: No Access · Read · Full Access
[ ] Old "write" or "read_write" data from backend maps to "Full Access" via normalizeAccessLevel()
[ ] ACCESS_LEVELS array used for all permission dropdowns — no hardcoded strings
[ ] Chip colors match spec: slate for No Access, amber for Read, green for Full Access
[ ] "Read & Write" label does not appear anywhere in the UI (replaced by "Full Access")

---

---

# BACKEND API REQUIREMENTS
## Hand to backend engineer

```
# ─────────────────────────────────────────────────────────────
# A. EMAIL & CREDENTIAL PROVISIONING
# ─────────────────────────────────────────────────────────────

# Doctor creation — update POST /api/doctors/
  email: required field (non-empty, valid format, unique across all users)

  On successful creation:
  1. Create a Django User account:
       username  = email (lowercased)
       email     = email
       password  = auto-generated temporary password (12 chars, mixed case + digits + symbols)
       is_active = True
  2. Link User to Doctor profile: doctor.user = created_user
  3. Set user.force_password_change = True (custom field — see §D)
  4. Send onboarding email to the email address containing:
       Subject: "Your MediFlow Portal Access"
       Body:
         - Portal URL (configurable in settings: PORTAL_URL)
         - Username: their email address
         - Temporary Password: the generated password
         - Instructions: "Log in and change your password on first access."
  5. Set doctor.has_account = True
  6. Return in response: has_account: true

  If email sending fails:
    Profile still created, user account still created.
    Return response with additional field: email_sent: false
    Frontend shows warning toast (not a blocking error).

  Error cases:
    email already registered to another user:
      400 { email: ["This email is already registered."] }

# Staff creation — update POST /api/staff/
  Same flow as Doctor above.
  email: required (add to Staff model)
  Create User account, link to staff profile, send onboarding email.
  staff.has_account: boolean field (True after account created)

# ─────────────────────────────────────────────────────────────
# B. FORCE PASSWORD CHANGE ON FIRST LOGIN
# ─────────────────────────────────────────────────────────────

# User model — add custom field
  force_password_change: BooleanField(default=False)
  Set to True when:
    - A new Doctor or Staff account is auto-created (temporary password)
  Set to False when:
    - User successfully changes their password via /api/auth/change-password/

# JWT login response — update CustomTokenObtainPairSerializer
  Add to token payload AND response body:
    force_password_change: bool

  If user.force_password_change = True:
    Token is issued normally (user IS authenticated)
    Frontend detects the flag and restricts navigation to /change-password only

# New endpoint: POST /api/auth/change-password/
  Authentication: required (Bearer token)
  Body: { new_password: string, confirm_password: string }
  Validation:
    new_password and confirm_password must match
    new_password min length 8
    new_password must contain: uppercase, digit, special character
    new_password must not equal the current (temporary) password
  On success:
    Set user.password = make_password(new_password)
    Set user.force_password_change = False
    Return: 200 { detail: "Password updated successfully." }
  On failure:
    400 { new_password: ["message"] }

  RBAC: any authenticated user can call this endpoint.
  Rate limit: max 5 attempts per 15 minutes per user.

# ─────────────────────────────────────────────────────────────
# C. PERMISSIONS ACCESS LEVEL NORMALISATION
# ─────────────────────────────────────────────────────────────

# If access levels are stored in the database (permissions table):
  Remove "write" as a valid stored value.
  Migration: UPDATE permissions SET access_level = 'full_access'
             WHERE access_level IN ('write', 'read_write')

# Valid access_level values going forward:
  "no_access"   — no access to the feature
  "read"        — read-only access
  "full_access" — read and write access (replaces both "write" and "read_write")

# If access levels are hardcoded in code (not DB):
  Update any CHOICES or enum that includes 'write' or 'read_write':
  ACCESS_CHOICES = [
    ('no_access',   'No Access'),
    ('read',        'Read'),
    ('full_access', 'Full Access'),
  ]

# API responses that include access_level:
  Never return "write" or "read_write" — always return "full_access".
  If migrated data might still have old values: normalise in the serializer:
    def get_access_level(self, obj):
        if obj.access_level in ('write', 'read_write'):
            return 'full_access'
        return obj.access_level

# ─────────────────────────────────────────────────────────────
# D. NEW MODEL FIELDS SUMMARY
# ─────────────────────────────────────────────────────────────

  Model        Field                    Type              Default
  ───────────  ───────────────────────  ────────────────  ────────────
  User         force_password_change    BooleanField      False
  Doctor       has_account              BooleanField      False
  Doctor       user (FK)                OneToOneField     null=True
  Staff        email                    EmailField        required
  Staff        has_account              BooleanField      False
  Staff        user (FK)                OneToOneField     null=True

# ─────────────────────────────────────────────────────────────
# E. ONBOARDING EMAIL TEMPLATE
# ─────────────────────────────────────────────────────────────

  Subject: "Your MediFlow Portal Access"

  Body (plain text + HTML version):
  ---
  Hello [first_name],

  Your MediFlow account has been created. Here are your login credentials:

  Portal:    [PORTAL_URL]
  Username:  [email]
  Password:  [temp_password]

  Please log in and change your password immediately.
  Your temporary password will expire after first use.

  If you did not expect this email, please contact your administrator.

  — The MediFlow Team
  ---

  Implementation: Django's send_mail() or django-anymail for production.
  PORTAL_URL: read from settings.py env variable.
  HTML version: styled with inline CSS matching brand colors.
  Async: send via Celery task or Django's thread-based async email backend
  so the HTTP response is not delayed by email sending.

# ─────────────────────────────────────────────────────────────
# F. UPDATED ENDPOINTS SUMMARY
# ─────────────────────────────────────────────────────────────

  Endpoint                        Method   Change
  ──────────────────────────────  ───────  ──────────────────────────────────────
  /api/doctors/                   POST     email required, triggers account + email
  /api/doctors/:id/               GET      returns has_account bool
  /api/staff/                     POST     email required, triggers account + email
  /api/staff/:id/                 GET      returns has_account bool
  /api/auth/login/                POST     response includes force_password_change
  /api/auth/change-password/      POST     NEW — set new password, clears flag
  /api/permissions/ (if exists)   GET/PUT  access_level normalised to 3 values
```
