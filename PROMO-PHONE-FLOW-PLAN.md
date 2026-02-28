### Promo + Phone Flow Update Plan

This document describes the plan to make **promo codes work reliably for both weekly credit top‑ups and daily voucher purchases**, especially for **new users without a phone number yet**, while keeping the backend promo rules unchanged and using shared, single‑source‑of‑truth logic on the frontend.

---

### Goals

- **Fix the bug** where new users with no phone number cannot submit credit/voucher promo requests and only see a generic “提交失败”.
- **Collect and persist phone numbers** at checkout (credit + voucher) so backend promo validation always has a phone when promos are used.
- **Share phone/promo logic** between daily and weekly flows via a small helper, instead of duplicating behaviour.
- **Surface clear backend error messages** (e.g. `PHONE_REQUIRED_FOR_PROMO`, `ALREADY_USED`) instead of only a generic failure.

---

### Affected Flows & Files

- **Weekly credit top‑up (weekly meal credits)**
  - UI: `components/credit-purchase-plans.tsx`
  - Backend: `app/api/credits/request/route.ts`

- **Daily voucher top‑up (2‑dish / 3‑dish vouchers)**
  - UI: `components/meal-voucher-purchase.tsx`
  - Backend: `app/api/voucher-requests/route.ts`

- **User profile and update**
  - Model: `models/User.ts` (`phone?: string`)
  - API route: `app/api/users/[id]/route.ts` (PATCH to update user fields)
  - Frontend helper: `lib/utils.ts` → `updateUser(id, userData)`

---

### Design Overview (Single Source of Truth)

**Key idea:** introduce a small, shared frontend helper that is the *only* place that knows how to:

- Read the current user (and `phone`) from localStorage.
- Decide **when** a phone number is required (based on promo usage).
- Normalize and validate the phone input.
- Call the existing `updateUser` API to persist the phone to the user profile.
- Update the cached `user` in localStorage so the rest of the app sees the new phone.

Both:

- `CreditPurchasePlans` (weekly credits), and
- `MealVoucherPurchase` (daily vouchers)

will call this helper **before** posting to their respective APIs whenever a promo code is in play. Backend promo logic (`PHONE_REQUIRED_FOR_PROMO`, etc.) stays unchanged.

---

### Step 1 – Add Shared Phone Helper

**New file:** `lib/phone-helper.ts` (name can be adjusted)

**Responsibilities:**

- Centralise “ensure user has a phone” logic so it’s used by both weekly and daily flows.
- Encapsulate localStorage handling and `updateUser` usage.

**Suggested API:**

- Types:

  ```ts
  interface EnsurePhoneOptions {
    userId: string;
    phoneInput: string;
    requirePhone: boolean;
  }

  interface EnsurePhoneResult {
    ok: boolean;
    errorMessage?: string;
    updatedUser?: User;
  }
  ```

- Helper functions:

  - `getStoredUser(): User | null`
    - Reads `localStorage.getItem('user')`, parses JSON safely, returns `null` on error.

  - `setStoredUser(user: User): void`
    - Writes updated user JSON back to `localStorage`.

  - `normalizePhoneInput(phone: string): string`
    - Trims spaces, collapses internal spaces, allows digits, spaces, +, -, etc.
    - Kept simple initially but centralised so we can tighten rules later in one place.

  - `async ensureUserPhone(options: EnsurePhoneOptions): Promise<EnsurePhoneResult>`
    - If `requirePhone === false` → return `{ ok: true }`.
    - Normalize `phoneInput`.
    - If `requirePhone === true` *and* normalized phone is empty:
      - Return `{ ok: false, errorMessage: 'Please enter your phone number.' }` (caller can localise).
    - Load user via `getStoredUser()`.
      - `currentPhone = user?.phone ?? ''`.
    - If `normalizedPhone === currentPhone` and non‑empty:
      - No update needed → `{ ok: true, updatedUser: user }`.
    - Else:
      - Call existing `updateUser(userId, { phone: normalizedPhone })`.
      - If API fails / returns `null`:
        - Return `{ ok: false, errorMessage: 'Failed to save phone number. Please try again.' }`.
      - On success:
        - Merge updated phone into stored user and call `setStoredUser(updatedUser)`.
        - Return `{ ok: true, updatedUser }`.

This becomes the **single source of truth** for phone + promo readiness on the frontend.

---

### Step 2 – Weekly Credits: Integrate Phone Field & Helper

**File:** `components/credit-purchase-plans.tsx`

1. **State & Prefill**
   - Add:
     - `const [phone, setPhone] = useState('')`.
   - In the existing `useEffect` where user/address/region is read from `localStorage`:
     - Use `getStoredUser()` from the phone helper.
     - If `user?.phone` exists, set that into `phone` so the field is pre‑filled for existing users.

2. **UI – Phone Input**
   - In the **upload/checkout** step (where payment proof, notes, and promo code input live):
     - Add a `Phone number` field:
       - Label: `language === 'zh' ? '手机号' : 'Phone number'`.
       - Helper text: e.g. “用于验证优惠码和联系送餐信息 / Used to verify your promo and contact you about delivery.”.
       - Controlled input:
         - `value={phone}`
         - `onChange={e => setPhone(e.target.value)}`

3. **When is Phone Required?**
   - Define:

     ```ts
     const isPromoUsed =
       !!appliedPromoCode || promoCodeInput.trim() !== '';
     const requirePhone = isPromoUsed; // optionally true always
     ```

   - This keeps the rule simple: **if a promo is used, phone is required**; otherwise, optional.

4. **Use `ensureUserPhone` in `handleSubmit`**
   - In `handleSubmit`, after basic field validation (plan selected, payment proof, email), and **before** uploading to S3:

     ```ts
     const phoneResult = await ensureUserPhone({
       userId,
       phoneInput: phone,
       requirePhone,
     });

     if (!phoneResult.ok) {
       toast({
         title: language === 'zh' ? '提交失败' : 'Submission Failed',
         description:
           language === 'zh'
             ? phoneResult.errorMessageZh ?? phoneResult.errorMessage
             : phoneResult.errorMessage,
         variant: 'destructive',
       });
       setIsLoading(false);
       return;
     }
     ```

   - After this succeeds, continue as today:
     - Upload proof via `/api/upload`.
     - Call `/api/credits/request` with promo code and other fields.

---

### Step 3 – Daily Vouchers: Mirror the Same Pattern

**File:** `components/meal-voucher-purchase.tsx`

1. **State & Prefill**
   - Add:
     - `const [phone, setPhone] = useState('')`.
   - Use `getStoredUser()` in the component’s initialisation (or existing effect where user data is read):
     - If `user?.phone` exists, set into `phone`.

2. **UI – Phone Input**
   - In the voucher purchase checkout section (where payment proof, notes, and promo code input live):
     - Add a phone field with the same pattern and labels as weekly.

3. **Phone Requirement**
   - Determine promo usage, similar to weekly:

     ```ts
     const isPromoUsed =
       !!appliedPromoCode || promoCodeInput.trim() !== '';
     const requirePhone = isPromoUsed;
     ```

4. **Use `ensureUserPhone` Before `/api/voucher-requests`**
   - In the daily voucher `handleSubmitPurchase` function:
     - After plan/payment proof validation but **before** uploading and calling `/api/voucher-requests`:

       ```ts
       const phoneResult = await ensureUserPhone({
         userId: user._id,
         phoneInput: phone,
         requirePhone,
       });

       if (!phoneResult.ok) {
         toast({
           title: language === 'zh' ? '提交失败' : 'Submission failed',
           description:
             language === 'zh'
               ? phoneResult.errorMessageZh ?? phoneResult.errorMessage
               : phoneResult.errorMessage,
           variant: 'destructive',
         });
         setIsLoading(false);
         return;
       }
       ```

     - Then proceed with existing logic:
       - Upload proof to S3.
       - Call `/api/voucher-requests`.

Now both daily and weekly flows share the *same* phone‑ensuring logic and rules.

---

### Step 4 – Shared Error Toast Pattern (Optional but Recommended)

To avoid duplicating error handling, we can introduce a tiny helper for submission errors.

**File (optional):** `lib/client-errors.ts`

- Function:

  ```ts
  export function showSubmissionError(
    language: 'zh' | 'en',
    error: unknown,
    fallbackEn: string,
    fallbackZh: string
  ) {
    const baseMessage =
      error instanceof Error && error.message
        ? error.message
        : language === 'zh'
          ? fallbackZh
          : fallbackEn;

    toast({
      title: language === 'zh' ? '提交失败' : 'Submission failed',
      description: baseMessage,
      variant: 'destructive',
    });
  }
  ```

- Use this in:
  - `CreditPurchasePlans` `catch` block.
  - `MealVoucherPurchase` `catch` block.
  - Any `ensureUserPhone` failure path.

This ensures backend errors like `PHONE REQUIRED FOR PROMO`, `ALREADY USED`, or `MAX USES REACHED` show up directly to the user instead of always “Please try again later”.

---

### Step 5 – Backend Behaviour (Read‑Only, No Change)

- Leave backend promo logic exactly as‑is:
  - `app/api/credits/request/route.ts`
  - `app/api/voucher-requests/route.ts`
- These routes:
  - Still require a phone for promo (`PHONE_REQUIRED_FOR_PROMO`).
  - Still enforce single‑use or max‑use rules (`ALREADY_USED`, `MAX_USES_REACHED`).
- Because the frontend now **ensures** phone is saved before sending promo requests, `PHONE_REQUIRED_FOR_PROMO` should no longer occur in normal promo flows.

---

### Step 6 – Testing Checklist

#### Weekly Credits

- [ ] **New user (no phone), with promo:**
  - Fill phone, upload proof, submit.
  - Expect:
    - `/api/users/:id` PATCH called with `phone`.
    - `/api/credits/request` returns `success: true`.
    - No `PHONE_REQUIRED_FOR_PROMO` in Network responses.

- [ ] **Existing user (has phone), with promo:**
  - Phone field is pre‑filled.
  - Submitting without editing phone succeeds.
  - Changing phone then submitting:
    - Updates user profile (visible after refresh).
    - Credits request still succeeds.

- [ ] **Weekly credits, promo error case:**
  - Use a promo that should fail (e.g. already used / invalid).
  - Toast shows human‑readable backend error, not only “提交失败”.

- [ ] **Weekly credits, no promo:**
  - Flow still works whether or not phone is provided (based on chosen `requirePhone` rule).

#### Daily Vouchers

- [ ] **New user (no phone), with promo:**
  - Same expectations as weekly, but for `/api/voucher-requests`.

- [ ] **Existing user (has phone), with promo:**
  - Same as weekly; phone pre‑filled, can be edited.

- [ ] **Daily vouchers, promo error case:**
  - Invalid / reused promo shows explicit backend message in toast.

- [ ] **Daily vouchers, no promo:**
  - Flow still works as intended (no unexpected phone requirement unless we explicitly decide otherwise).

#### Monitoring

- [ ] After deployment, watch Vercel logs:
  - Verify `/api/credits/request` and `/api/voucher-requests` 400 responses no longer include `errorCode: \"PHONE_REQUIRED_FOR_PROMO\"` in normal use.
  - Confirm any remaining 400s are explainable promo errors (already used, invalid, etc.).

---

### Implementation To‑Dos (Summary)

1. **Create `lib/phone-helper.ts`**
   - Implement `getStoredUser`, `setStoredUser`, `normalizePhoneInput`, and `ensureUserPhone`.

2. **Weekly credits (`CreditPurchasePlans`)**
   - Add `phone` state and prefill from stored user.
   - Render phone input in the checkout step.
   - Determine `requirePhone` based on promo usage.
   - Call `ensureUserPhone` in `handleSubmit` before S3 upload and `/api/credits/request`.
   - Update error handling to surface real backend messages.

3. **Daily vouchers (`MealVoucherPurchase`)**
   - Add `phone` state and prefill from stored user.
   - Render phone input in the checkout step.
   - Determine `requirePhone` based on promo usage.
   - Call `ensureUserPhone` in `handleSubmitPurchase` before S3 upload and `/api/voucher-requests`.
   - Update error handling to surface real backend messages.

4. **(Optional) Add shared `showSubmissionError` helper**
   - Use in both components’ `catch` blocks and `ensureUserPhone` failure paths.

5. **Run through the testing checklist** for both weekly and daily promo flows.

