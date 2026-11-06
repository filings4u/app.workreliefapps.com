# WorkRelief Applications — app.workreliefapps.com

This is the application repository, separate from the public marketing website in `filings4u/workreliefapps.com`.

- `app/`: application pages, subscriptions, customer dashboard, CRM, scheduling, billing, TMS and their supporting scripts/styles. Existing relative routes are preserved.
- `assets/img/`: shared WorkRelief logo and favicon used by application pages.
- `images/`: owner-created image folder preserved.
- `checkout.html`, `purchase-success.html`, `reset-password.html`: checkout and account flows from the original repository.
- `index.html`: entrypoint forwarding to `/app/login.html`.

Deploy this repository to `app.workreliefapps.com`. Configure authentication redirect URLs and backend secrets separately; verify browser functionality before removing app code from the public site.
