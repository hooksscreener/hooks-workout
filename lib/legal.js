// One place for the legal text. Change SUPPORT_EMAIL here once the domain email forwarding exists.
export const APP_NAME = "CapitalGains";
export const SUPPORT_EMAIL = "support@capitalgainsapp.com"; // TODO: confirm the domain and forwarding before launch
export const LEGAL_DATE = "November 16, 2026";

export const PRIVACY = [
  { h: "The short version", p: [
    `${APP_NAME} is a strength tracker. We keep the training data you enter so the app can show your progress. We do not run ads, we do not use analytics or tracking tools, and we do not sell your data.`,
  ] },
  { h: "What we collect", p: [
    "Training data you enter: workouts, exercises, sets, weights, reps, notes, rest days, and your settings. If you enter a body weight, that is stored too.",
    "A passcode or name that identifies your data. When accounts are added, this will be your sign in details (for example an email address, or a Google or Apple sign in).",
    "Messages you send through the feedback box, along with the name tied to your passcode.",
    "Photos you choose to take with the camera features. They are used for that one request only (see Third parties).",
    "Basic server logs from our hosting provider (such as IP address and time of request). We use them only to keep the app running and fix errors.",
  ] },
  { h: "Where your data lives", p: [
    "On your device, the app keeps a local copy so it works offline. In the cloud, your training data is stored in a database (Upstash Redis) so you can reach it from your phone and keep a backup. The app is hosted on Vercel.",
  ] },
  { h: "Third parties", p: [
    "Anthropic (the Claude AI service). If you use the camera to identify a machine or read workout notes, the photo is sent to Anthropic to get a result back. If you turn on the AI digest, summary training stats (exercise names, weights, trends, no name or email) are sent to produce the text. We do not keep the photos. Anthropic handles that data under its own terms and privacy policy.",
    "Google Fonts. The app loads its text fonts from Google, which can see your IP address when the fonts load.",
    "Upstash and Vercel store and serve the data described above.",
    "We do not share your data with advertisers or data brokers.",
  ] },
  { h: "Your choices and deletion", p: [
    "You can export a backup of your data from Settings at any time.",
    `To delete your data, email ${SUPPORT_EMAIL} and we will delete everything tied to your account. In-app deletion will be added when accounts launch.`,
    "You can turn off the AI digest in Settings. You can skip the camera features entirely.",
  ] },
  { h: "Retention", p: [
    "We keep your data until you ask us to delete it. Feedback messages are kept in a limited list and older ones roll off.",
  ] },
  { h: "Children", p: [
    `${APP_NAME} is not directed to children under 13, and we do not knowingly collect their data.`,
  ] },
  { h: "Changes", p: [
    "The app is updated often. We may add features or tools later, such as accounts, posting a finished workout, or analytics. If that changes what we collect or share, we will update this page and the date below before it takes effect.",
  ] },
  { h: "Contact", p: [`Questions or requests: ${SUPPORT_EMAIL}`, `Last updated ${LEGAL_DATE}.`] },
];

export const TERMS = [
  { h: "Using the app", p: [
    `By using ${APP_NAME} you agree to these terms. If you do not agree, do not use the app.`,
  ] },
  { h: "Not medical or coaching advice", p: [
    "The app tracks your training and suggests targets from your own numbers. It is not medical advice, a diagnosis, or a replacement for a coach or doctor. Exercise carries risk. Lift within your limits, use good form and spotters where needed, and stop if something hurts. You use the app and any suggestion at your own risk.",
  ] },
  { h: "Your data", p: [
    "You own the training data you enter. You give us permission to store and process it to run the app for you. See the Privacy Policy for details.",
  ] },
  { h: "Fun comparisons and estimates", p: [
    "Comparisons such as animals, cars or other objects, and estimates such as e1RM, are for fun and rough guidance. They may not be exact.",
  ] },
  { h: "Acceptable use", p: [
    "Do not misuse the app, try to break or probe it, access other people's data, or overload the AI features. We may limit or stop access to protect the service.",
    "If posting of finished workouts is added, you may only post your own workout data, posting is always your choice, and you must not post anything unlawful, abusive or misleading. We may remove posts and accounts that break these rules.",
  ] },
  { h: "Availability", p: [
    "The app is provided as is. We try to keep it running and your data safe, but we cannot promise it will always be available or error free. Keep your own backup from Settings.",
  ] },
  { h: "Liability", p: [
    "To the extent the law allows, we are not liable for indirect or consequential losses, lost data, or injuries connected to using the app. Nothing here limits rights you have under law that cannot be waived.",
  ] },
  { h: "Changes and contact", p: [
    "We may update these terms. Continuing to use the app after a change means you accept it.",
    `Contact: ${SUPPORT_EMAIL}`, `Last updated ${LEGAL_DATE}.`,
  ] },
];

export const LEGAL_DOCS = { privacy: { title: "Privacy Policy", body: PRIVACY }, terms: { title: "Terms of Use", body: TERMS } };
