## 2025-05-15 - [Keyboard Shortcut for Quick Search]
**Learning:** Operational pages with large data tables benefit significantly from quick access to search. Adding a '/' keyboard shortcut improves speed for power users, but it needs a visual cue so it's discoverable.

**Action:** Implement the `useSearchShortcut` hook and pair it with a visual `<kbd>` hint that toggles visibility based on focus and input state. Ensure the hook ignores key presses when the user is already typing in other inputs to avoid accidental focus hijacking.

## 2025-05-16 - [Accessible Form Feedback & Context]
**Learning:** For authentication forms, providing immediate and linked context is crucial for accessibility. Screen readers need explicit labels for icon-only inputs, immediate feedback on error messages via ARIA roles, and clear linkage between input fields and their requirement hints (like password length) using `aria-describedby`. Additionally, keeping text visible in loading buttons prevents layout shifts and maintains user context.

**Action:** Always link form requirement hints to inputs using `aria-describedby`. Use `role="alert"` and `aria-live="polite"` for dynamic error messages. Ensure buttons maintain their dimensions or provide descriptive text during loading states.

## 2025-05-17 - [Accessible Custom Selects & Localization]
**Learning:** Custom components like `SearchSelect` need explicit keyboard handling (like the `Escape` key) to meet accessibility standards. Closing a dropdown should ideally return focus to its trigger button to maintain the user's place. Additionally, all `aria-label` attributes must be localized via translation files to ensure a consistent experience for screen reader users across all supported languages.

**Action:** Implement `Escape` key listeners in custom dropdowns that close the menu and return focus to the trigger. Always use localized strings for `aria-label` and `title` attributes.

## 2025-06-21 - [Standardized Independent Password Toggles]
**Learning:** Using a single global checkbox to toggle multiple password fields (like "Current", "New", and "Confirm") is a sub-optimal UX pattern. Independent toggles on each field, implemented via local component state, provide better control and follow modern security standards. Consistency in input styling (icons, borders) between login and profile pages creates a more cohesive user experience.

**Action:** Replace form-level password visibility checkboxes with individual toggle buttons inside each password input. Ensure these toggles have localized ARIA labels and titles, and use a consistent flex-based input container (e.g., DaisyUI's `label.input.input-bordered`) for grouping icons with inputs.

## 2025-07-23 - [Localized Profile Management & Accessible Hints]
**Learning:** Extending accessibility patterns (like `aria-describedby` for hints and `aria-live` for alerts) to all user-facing forms, including Profile and Change Password, ensures a consistent and predictable experience for assistive technology users. Using a dedicated `Profile` translation namespace helps centralize management of account-related strings and prevents duplication across components.

**Action:** Consistently apply `aria-describedby` for field-specific requirements and `aria-live="polite"` for form-level status alerts across all operational and profile-related forms. Always utilize the centralized `Profile` namespace for account management UI strings.

## 2025-08-25 - [Caps Lock Detection for Password Fields]
**Learning:** Entering passwords with Caps Lock inadvertently active is a common user error. Providing a localized, accessible warning (using 'role="alert"' and 'aria-live="polite"') significantly improves the login and password-change experience by offering immediate corrective feedback.

**Action:** Use 'getModifierState("CapsLock")' on 'keydown' and 'keyup' events to detect Caps Lock state. Display the warning message (localized via the 'Auth' namespace) below the input field, utilizing existing 'text-warning' and 'animate-fadeIn' classes for visual consistency.

## 2025-09-10 - [Handling Multiple ARIA Descriptions for Inputs]
**Learning:** Inputs often require both a persistent hint (e.g., character requirements) and a dynamic error message. Accessibility is compromised if the error message replaces the hint in `aria-describedby`. Concatenating multiple IDs in the attribute ensures the screen reader provides full context to the user.

**Action:** Dynamically compute the `aria-describedby` value by filtering and joining all applicable IDs (hints, errors, status messages). Ensure each piece of feedback has a unique, stable ID.

## 2025-09-20 - [Enhanced LanguageSwitcher UX & Affordance]
**Learning:** For global components like a language switcher, visual affordance (like a globe icon) is critical for immediate recognition across different locales. Furthermore, CSS-only dropdowns (like DaisyUI's) can feel "sticky" after a selection is made; programmatically blurring the active element provides immediate visual confirmation that the action was triggered.
**Action:** Always pair language selection triggers with a globe icon for universal recognition. Use `document.activeElement.blur()` in selection handlers for CSS-only dropdowns to ensure they close immediately upon user interaction.

## 2025-10-15 - [Enhanced ScrollToTop with Progress & Focus Management]
**Learning:** A standard "scroll to top" button can be enhanced with a visual progress ring to provide feedback on reading progress. Crucially, for accessibility, triggering a scroll to top should also programmatically move focus back to the start of the main content (e.g., #main-content) to prevent keyboard users from being "stranded" at the bottom of the page.

**Action:** Implement an SVG progress ring using stroke-dashoffset calculated from scroll percentage. Always include a delayed focus shift (e.g., 500ms) to the main content area in the scroll-to-top click handler.

## 2025-10-20 - [Accessible Drawer Focus Management]
**Learning:** Drawers and modals must manage focus to be truly accessible. This includes moving focus into the component when it opens and returning it to the trigger when it closes. Crucially, focus-return logic must skip the initial mount to avoid stealing focus on page load.
**Action:** Use a "isFirstRender" ref to gate focus-return logic in useEffects. Always pair drawers with appropriate ARIA roles (dialog, modal) and attributes (aria-expanded, aria-controls) to inform assistive technologies of state changes.

## 2025-11-20 - [Pre-Auth Accessibility & Localization]
**Learning:** For apps with multi-lingual users, providing a language switcher on the login page is a critical accessibility requirement. Users should be able to understand the interface and any error messages before they have an account or session. Centralizing all landing page strings (including loading tips and metadata) into the i18n system ensures a cohesive and professional first impression.

**Action:** Always include the `LanguageSwitcher` on the root Login page. Ensure that even non-form elements like marketing copy, loading tips, and specific error messages (e.g., "invalid credentials") are fully localized using the app's standard i18n framework.

## 2025-12-05 - [Visual-First Localized Access States]
**Learning:** Standardizing unauthorized access states with a localized, visual-first component improves both accessibility for multi-lingual users and the overall professional feel of the application. Pairing technical messages with recognizable visual icons (like a pulsing lock) aids immediate recognition even before the text is read.

**Action:** Use the `Common` translation namespace for global application states. Always pair high-impact feedback (like Access Denied) with thematic icons and entry animations to provide clear, delightful interactive feedback.

## 2025-12-20 - [A11y and Focus states on Responsive Icon-Only Buttons]
**Learning:** Buttons that selectively hide text labels on smaller viewport sizes (using classes like `hidden sm:inline`) must be configured with programmatic equivalents (`aria-label`) and explicit focus rings (`focus-visible:ring-2 focus-visible:ring-primary`) to maintain accessibility compliance and visible navigation anchors for keyboard/screen-reader users on mobile layouts.

**Action:** Always attach explicit `aria-label` attributes equal to the fallback label and `focus-visible:ring-2 focus-visible:ring-primary` class names to elements that hide their text on smaller screens.

## 2026-03-05 - [Onboarding Tour Focus Control & ARIA States]
**Learning:** Interactive onboarding tours (like `AppTour`) present complex accessibility challenges, as focusing the onboarding modal container upon activation is critical to allow screen readers to parse the new context. Crucially, focus return logic on close must bypass the initial render to prevent focus hijacking during page loading, and the trigger button must leverage dynamic `aria-expanded` and `aria-controls` properties for robust screen-reader announcement.

**Action:** Gate focus return effects with an `isFirstRender` ref, configure the modal container with `tabIndex={-1}` and focus it on open, and always keep ARIA attributes in sync with component toggle states.

## 2026-03-20 - [Escape Key Dropdown Dismissal & Semantic Triggers]
**Learning:** Pure CSS-only dropdowns (like DaisyUI's focus-within dropdowns) are simple but lack default keyboard dismissal handlers. Users navigate with Tab but are stuck inside or unable to dismiss the dropdown easily. Implementing an Escape keydown listener on the container, which programmatically blurs `document.activeElement` to clear focus and immediately returns focus back to the trigger button, provides standard accessible behavior. Additionally, using native `<button type="button">` instead of generic `div` elements with `role="button"` ensures native Enter/Space activation without manual key listeners.

**Action:** Always prefer native `<button>` elements for interactive triggers. Implement Escape key listeners on CSS-only dropdown containers to blur active elements and return focus back to the trigger.

## 2026-03-25 - [Accessible Dialogue Interactions & Associated File Inputs]
**Learning:** For dialog components like `DeleteModal` that handle uploads, accessibility is vastly improved when label associations and keyboard listeners are configured. Utilizing proper `htmlFor` attributes on the file label legend elements linked to the input ID, alongside `aria-describedby` mapping dynamically to both static hints and dynamic alerts, ensures screen reader users receive complete operational details. Additionally, adding an `Escape` keydown listener (guarded against active loaders) provides a smooth, standardized dialogue dismissal flow.

**Action:** Associate file input elements with proper legends or text labels via `htmlFor`. Utilize dynamic `aria-describedby` attributes to associate inputs with active state alerts and descriptions. Implement gated Escape listeners to gracefully dismiss modals.

## 2026-03-26 - [Keyboard Activation & Focus on Custom Select Triggers]
**Learning:** For custom select/combobox triggers (like `SearchSelect`), keyboard accessibility must start on the trigger button. Implementing support for standard keyboard events (`ArrowDown`, `ArrowUp`, `Enter`, and `Space`) on the trigger button to open the menu and transition focus to the auto-focused search input creates a seamless, standard-compliant experience. Additionally, explicit `focus-visible` ring indicators are critical for keeping keyboard-only users oriented.

**Action:** Always map standard select trigger keyboard keys on custom dropdown buttons to open the select, and apply explicit focus rings (`focus-visible:ring-2 focus-visible:ring-primary/40`) to make the focused state highly recognizable.

## 2026-03-27 - [Accessible Reusable Modal Focus & Escape Flow]
**Learning:** Reusable containers like `FormModal` are easily overlooked for keyboard navigation and screen-reader accessibility. Storing and restoring the previously active document element (`document.activeElement`) during modal transitions, paired with a gated `Escape` listener that respects active loading/saving locks, provides standard-compliant screen-reader orientation and a seamless user experience.

**Action:** When creating or hardening interactive modal wrappers, always capture and restore active elements using React `useRef` and hook cleanup functions, and safeguard all escape dismissals with loading flags.

## 2026-03-28 - [Accessible Native Triggers & Dismissal on Selection for DaisyUI Dropdowns]
**Learning:** Pure CSS dropdown components (like DaisyUI's `dropdown-end`) often lack keyboard support and stay "sticky" when options inside are clicked, which degrades accessibility and user experience. Upgrading the trigger to a semantic HTML `<button type="button">`, pairing it with an `Escape` key listener that blurs `document.activeElement` and returns focus to the trigger, and programmatically blurring the focused element upon selecting dropdown options provides an incredibly fluid, accessible, and delightful interactive experience.

**Action:** Always prefer native `<button>` elements for DaisyUI dropdown triggers. Provide robust keyboard dismissal with `Escape` that returns focus to the trigger, and programmatically blur the active element on dropdown selection to immediately collapse the persistent CSS-only dropdown menu.

## 2026-03-29 - [Accessible Focus Rings & React 19 State Derivation for Interactive Image Thumbnails]
**Learning:** Table components display dense visual content like photos via components like `PhotoCell`. When these photo cells act as anchors wrapping the image, screen readers and keyboard navigation require explicit `focus-visible` styles on the outer wrapper so users are never "lost" when navigating with a keyboard. Additionally, using React 19's state derivation pattern to reset image sources dynamically on prop updates removes `useEffect` overhead and prevents state-out-of-sync bugs.

**Action:** Always wrap interactive image elements in native anchors with `focus-visible:ring-2 focus-visible:ring-primary` and explicit offsets for robust visual focus feedback. Use render-phase state updates (state derivation) to propagate dynamic prop changes to state without standard side-effects.
