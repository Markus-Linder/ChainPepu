// ser7 – Übersetzungen der Unterseiten. Grundsprache Englisch, weitere Sprachen nach Browser.
(function () {
  const DE = {
    'l.imprint': 'Impressum', 'l.terms': 'AGB', 'l.privacy': 'Datenschutz',
    'nav.search': 'Zur Suche', 'nav.submit': 'Eintragen', 'nav.advertise': 'Werbung schalten', 'nav.admin': 'Verwaltung',
    's.title': 'Webseite oder Video eintragen',
    's.lead': 'Kostenlos. Jede Einreichung wird automatisch vorgeprüft und danach von uns freigegeben. Illegale, sexuelle, rassistische oder volksverhetzende Inhalte werden nicht aufgenommen.',
    'kind.web': 'Webseite', 'kind.video': 'Video', 'f.url': 'Adresse', 'f.title': 'Titel', 'f.title.ph': 'So soll dein Eintrag heißen',
    'f.desc': 'Beschreibung', 'f.desc.hint': 'bis 600 Zeichen', 'f.desc.ph': 'Worum geht es auf der Seite?',
    'f.kw': 'Suchwörter', 'f.kw.hint': 'durch Komma getrennt – bei diesen Suchen erscheint dein Eintrag',
    'f.promo': 'Aktuelle Aktion', 'f.promo.hint': 'optional, erscheint über deiner Seite', 'f.promo.ph': '15 % auf alle Sneaker',
    'f.until': 'Aktion gültig bis', 'opt': 'optional', 'f.email': 'E-Mail', 'f.email.hint': 'optional, für Rückfragen – wird nicht veröffentlicht',
    's.accept': 'Ich bestätige, dass die Inhalte legal sind, ich zur Eintragung berechtigt bin und keine sexuellen, rassistischen oder anderweitig rechtswidrigen Inhalte enthalten sind.',
    's.send': 'Eintragen', 'checking': 'Wird geprüft …', 'err.generic': 'Das hat nicht geklappt. Bitte später erneut versuchen.',
    'err.net': 'Keine Verbindung. Bitte später erneut versuchen.', 'hint.web': 'z. B. https://meinshop.de',
    'hint.video': 'z. B. https://youtube.com/watch?v=… oder ein Link zu einer .mp4-Datei',
    'a.dash': 'Deine Anzeige', 'a.status': 'Status', 'a.imp': 'Einblendungen', 'a.clicks': 'Besuche', 'a.ctr': 'Klickrate', 'a.until': 'Läuft bis',
    'a.bookmark': 'Speichere diese Seite als Lesezeichen – über diesen Link siehst du jederzeit deine Zahlen.',
    'a.title': 'Sponsorplatz buchen',
    'a.lead': 'Deine Seite steht bei passenden Suchen ganz vorne an der Straße, golden hervorgehoben und als Anzeige gekennzeichnet. Aktionen wie „15 % auf alles“ erscheinen als rotes Banner über deiner Seite.',
    'a.url': 'Zieladresse', 'a.head': 'Überschrift', 'a.head.hint': 'bis 80 Zeichen', 'a.head.ph': 'Mein Shop – Sneaker zum Bestpreis',
    'a.desc.hint': 'bis 300 Zeichen', 'a.desc.ph': 'Was bietest du an?', 'a.kw.hint': 'durch Komma getrennt – bei diesen Suchen erscheint deine Anzeige',
    'a.promo': 'Aktion', 'a.promo.hint': 'optional, z. B. „15 % auf alle Sneaker“', 'a.days': 'Laufzeit', 'a.email': 'E-Mail für Rechnung und Rückfragen',
    'a.preview': 'So sieht deine Anzeige aus', 'a.price': 'Preis inkl. aller Gebühren', 'days': 'Tage',
    'a.accept': 'Ich buche als Unternehmer (§ 14 BGB) und akzeptiere die AGB. Ich bestätige, dass die beworbenen Inhalte legal sind und keine sexuellen, rassistischen, gewaltverherrlichenden oder irreführenden Inhalte enthalten. Die Anzeige wird vor dem Start geprüft; bei Ablehnung wird der Betrag erstattet.',
    'a.send': 'Weiter zur Bezahlung', 'a.checking': 'Anzeige wird geprüft …', 'a.sponsored': 'ANZEIGE · GESPONSERT',
    'a.ph.title': 'Deine Überschrift', 'a.ph.desc': 'Deine Beschreibung erscheint hier.',
    'a.nopay': 'Hinweis: Die Online-Bezahlung wird gerade eingerichtet. Du kannst trotzdem buchen – wir melden uns per E-Mail.',
    'a.cancelled': 'Die Bezahlung wurde abgebrochen. Du kannst unten neu buchen.', 'a.confirming': 'Zahlung wird bestätigt …',
    'a.unpaid': 'Die Buchung ist gespeichert, aber noch nicht bezahlt.', 'a.review': 'Danke für deine Zahlung! Deine Anzeige wird geprüft und startet nach der Freigabe.',
    'a.active': 'Deine Anzeige ist aktiv.', 'a.rejected': 'Die Anzeige wurde abgelehnt. Der Betrag wird erstattet.', 'a.notfound': 'Buchung nicht gefunden.',
    'st.unpaid': 'Offen', 'st.review': 'In Prüfung', 'st.active': 'Aktiv', 'st.rejected': 'Abgelehnt', 'st.pending': 'Zu prüfen', 'st.approved': 'Online',
    'ad.lead': 'Hier gibst du eingetragene Webseiten, Videos und gebuchte Sponsorplätze frei.', 'ad.pw': 'Passwort', 'ad.login': 'Anmelden',
    'ad.open': 'Zu prüfen', 'ad.all': 'Alle', 'ad.s1': 'Einträge zu prüfen', 'ad.s2': 'Anzeigen zu prüfen', 'ad.s3': 'Einträge online', 'ad.s4': 'Anzeigen aktiv', 'ad.s5': 'Umsatz bezahlt',
    'ad.camps': 'Gebuchte Sponsorplätze', 'ad.lists': 'Eingetragene Webseiten und Videos', 'ad.nothing': 'Nichts zu tun.',
    'ad.approve': 'Freigeben', 'ad.start': 'Freigeben und starten', 'ad.reject': 'Ablehnen', 'ad.check.ok': 'Vorprüfung unauffällig', 'ad.check': 'Vorprüfung',
    'ad.kw': 'Suchwörter', 'ad.promo': 'Aktion', 'ad.until': 'bis', 'ad.imp': 'Einblendungen', 'ad.visits': 'Besuche', 'ad.runs': 'läuft bis',
    'ad.badpw': 'Falsches Passwort oder Passwort noch nicht eingerichtet.', 'ad.paid.review': 'Bezahlt · zu prüfen', 'ad.unpaid': 'Unbezahlt',
  };
  const DICTS = { de: DE };
  let lang = 'en';
  try {
    const forced = new URLSearchParams(location.search).get('lang');
    lang = (forced || (navigator.languages || [navigator.language || 'en'])[0] || 'en').toLowerCase().split('-')[0];
  } catch { /* ignorieren */ }
  const dict = DICTS[lang] || null;
  window.SER7_LANG = dict ? lang : 'en';
  window.t = (key, fallback) => (dict && dict[key]) || fallback;
  document.documentElement.lang = window.SER7_LANG;
  if (!dict) return;
  const apply = () => {
    document.querySelectorAll('[data-t]').forEach((el) => { const v = dict[el.dataset.t]; if (v) el.textContent = v; });
    document.querySelectorAll('[data-tp]').forEach((el) => { const v = dict[el.dataset.tp]; if (v) el.placeholder = v; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
