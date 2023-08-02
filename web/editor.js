// Globals

let language;

// Error handling

function fatalError(primary, secondary = null) {
  document.getElementById('form').classList.add('hidden');

  const element = document.getElementById('error');
  element.classList.remove('hidden');
  element.innerText = primary;

  if (secondary) {
    const element2 = document.createElement('div');
    element2.classList = ['error-secondary'];
    element2.innerText = secondary;
    element.appendChild(element2);
  }

  throw new Error(primary);
}

function setError(id, message = '') {
  document.getElementById(id).innerText = message;
}

// Localization

const TRANSLATIONS = {
  // English
  en: {
    'title': 'Attribution Metadata Editor',
    'auth-label': 'Authentication',
    'auth-password': 'Password',
    'attrib-label': 'Attribution',
    'site-label': 'Site',
    'site-placeholder': 'scp-jp',
    'page-label': 'Page',
    'page-placeholder': 'scp-001',
    'page-info-wikidot': 'Wikidot page ',
    'page-info-comma': ', ',
    'page-info-period': '.',
    'page-info-created-by': 'created by ',
    'page-info-created-by-unknown': 'Unknown',
    'page-missing': 'Page not found in Crom',
    'page-fetch': 'Fetch',
    'attribution-author': 'Author',
    'attribution-rewrite': 'Rewrite',
    'attribution-translator': 'Translator',
    'attribution-maintainer': 'Maintainer',
    'admin-label': 'Administration',
    'admin-password': 'Admin Password',
    'admin-change-password': 'Change password',
    'password-type-regular': 'Regular',
    'password-type-admin': 'Admin',
    'old-password': 'Old Password',
    'new-password': 'New Password',
    'error-password': 'Invalid password',
    'error-site': 'Invalid site',
    'error-site-fatal': 'Unknown site: ',
    'error-site-fatal-secondary': 'Pass in a site slug or INT language code',
    'info-source': 'source',
  },
};

function getMessage(messageKey) {
  // Special case:
  // The 'test' language just echoes the message key back out.
  if (language === 'test') {
    return messageKey;
  }

  const messages = TRANSLATIONS[language];
  if (!messages) {
    fatalError(`No translations for language: ${language}`);
  }

  const message = messages[messageKey];
  if (!message) {
    fatalError(`No such message key: ${messageKey}`);
  }

  return message;
}

// Crom

const CROM_ENDPOINT = 'https://api.crom.avn.sh/graphql';
const CROM_PAGE_QUERY = `
{
  page(url: $url) {
    wikidotInfo {
      title,
      rating,
      createdAt,
      createdBy {
        wikidotInfo { displayName }
      }
    }
  }
}
`;
const CROM_USER_QUERY = `
{
  user(name: $user) {
    wikidotInfo {
      displayName,
      wikidotId,
    }
  }
}
`;

async function queryCrom(query) {
  const request = new Request(CROM_ENDPOINT, {
    keepalive: true,
    method: 'POST',
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const response = await fetch(request);
  const { data } = await response.json();
  return data;
}

async function getPageInfo(site, page) {
  const url = `http://${site}.wikidot.com/${page}`;
  const query = CROM_PAGE_QUERY.replace('$url', JSON.stringify(url));
  const { page: { wikidotInfo } } = await queryCrom(query);
  if (wikidotInfo === null) {
    return null;
  }

  const { title, rating, createdAt, createdBy: { wikidotInfo: { displayName } } } = wikidotInfo;
  return {
    url,
    title,
    score: rating,
    createdAt: new Date(createdAt),
    createdBy: displayName,
  };
}

async function getUserInfo(name) {
  const query = CROM_USER_QUERY.replace('$user', JSON.stringify(name));
  const { user: { wikidotInfo } } = await queryCrom(query);

  if (wikidotInfo === null) {
    return { name: null, id: null };
  } else {
    const { displayName: name, wikidotId: id } = wikidotInfo;
    return { name, id };
  };
}

// AttributionMetadataService

const ATTRIB_ENDPOINT = 'https://tptm7stb3j3onds27seddf2izq0mcesv.lambda-url.us-east-2.on.aws';
// TODO

async function checkPassword(type, value) {
  // TODO
}

// Handlers

function buildPasswordCheck(type, id) {
  return async function check(event) {
    // Check password in API, or clear error if empty
    let valid;
    if (event.target.value) {
      valid = await checkPassword(type, event.target.value);
    } else {
      valid = true;
    }

    const message = valid ? '' : getMessage('error-password');
    document.getElementById(id).innerText = message;
  };
}

const mainPasswordCheck = buildPasswordCheck('regular', 'auth-password-error');
const adminPasswordCheck = buildPasswordCheck('admin', 'admin-password-error');

function siteCheck(event) {
  const site = getSiteSlug(event.target.value);
  const valid = (site !== null);
  const message = valid ? '' : getMessage('error-site');
  document.getElementById('main-site-error').innerText = message;

  if (site !== null) {
    event.target.value = site;
  }
}

async function fetchPage(event) {
  const siteSlug = document.getElementById('main-site').value;
  const pageSlug = document.getElementById('main-page').value;
  const pageInfo = await getPageInfo(siteSlug, pageSlug);

  const element = document.getElementById('main-status');
  deleteChildren(element);

  if (pageInfo === null) {
    element.classList = ['error'];
    element.innerText = getMessage('page-missing');
  } else {
    const info = document.createElement('span');
    const link = document.createElement('a');
    link.href = pageInfo.url;
    link.target = '_blank';
    link.innerText = pageInfo.title;

    function textNode(text) {
      return document.createTextNode(text);
    }
    function message(messageKey) {
      return textNode(getMessage(messageKey));
    }

    info.appendChild(message('page-info-wikidot'));
    info.appendChild(link);
    info.appendChild(textNode(' '));

    const score = pageInfo.score >= 0 ? `(+${pageInfo.score})` : `(${pageInfo.score})`;
    info.appendChild(textNode(score));

    info.appendChild(message('page-info-comma'));
    info.appendChild(message('page-info-created-by'));
    info.appendChild(textNode(pageInfo.createdBy || getMessage('page-info-created-by-unknown')));
    info.appendChild(message('page-info-comma'));
    info.appendChild(textNode(renderDate(pageInfo.createdAt)));
    info.appendChild(message('page-info-period'));

    element.appendChild(info);
  }

  // TODO add attribution data
}

// Utilities

const ATTRIBUTION_TYPES = [
  'author',
  'rewrite',
  'translator',
  'maintainer',
];

function getAttributionType(value) {
  value = value.toLowerCase();

  for (const attributionType of ATTRIBUTION_TYPES) {
    if (attributionType.startsWith(value)) {
      return attributionType;
    }
  }

  fatalError(`Invalid attribution type: ${value}`);
}

function getSiteSlug(site) {
  // The input can be the site slug or the branch language code.

  switch (site.toLowerCase()) {
    // SCP
    case 'en':
    case 'scp-wiki':
      return 'scp-wiki';
    case 'ru':
    case 'scp-ru':
      return 'scp-ru';
    case 'ko':
    case 'scpko':
      return 'scpko';
    case 'cn':
    case 'scp-wiki-cn':
      return 'scp-wiki-cn';
    case 'fr':
    case 'fondationscp':
      return 'fondationscp';
    case 'pl':
    case 'scp-pl':
      return 'scp-pl';
    case 'es':
    case 'lafundacionscp':
      return 'lafundacionscp';
    case 'th':
    case 'scp-th':
      return 'scp-th';
    case 'jp':
    case 'scp-jp':
      return 'scp-jp';
    case 'de':
    case 'scp-wiki-de':
      return 'scp-wiki-de';
    case 'it':
    case 'fondazionescp':
      return 'fondazionescp';
    case 'uk':
    case 'scp-ukrainian':
      return 'scp-ukrainian';
    case 'pt':
    case 'pt-br':
    case 'scp-pt-br':
      return 'scp-pt-br';
    case 'cs':
    case 'scp-cs':
      return 'scp-cs';
    case 'zh':
    case 'zh-tr':
      return 'scp-zh-tr';
    case 'vn':
    case 'scp-vn':
      return 'scp-vn';

    // Wanderer's Library
    case 'wl':
    case 'wl-en':
      return 'wanderers-library';

    // Unknown or typo
    default:
      return null;
  }
}

function debounce(func, wait) {
  let timeoutId;

  return function inner(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

function deleteChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.lastChild);
  }
}

function renderDate(date) {
  function tryRender(locale) {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      day: 'numeric',
      month: 'long',
    });
  }

  try {
    return tryRender(language);
  } catch {
    // Try navigator.languages
  }

  for (const locale of navigator.languages) {
    try {
      return tryRender(language);
    } catch {
      // Try next locale
    }
  }

  // Everything has failed, return default render for Date.
  return date + '';
}

// Initialization

function initializeSite(site) {
  site = getSiteSlug(site);
  if (site === null) {
    fatalError(
      getMessage('error-site-fatal') + site,
      getMessage('error-site-fatal-secondary'),
    );
  }

  document.getElementById('main-site').value = site;
}

function initializeMessages() {
  function setMessage(id, messageKey = null) {
    document.getElementById(id).innerText = getMessage(messageKey || id);
  }

  function setPlaceholder(id, messageKey) {
    document.getElementById(id).placeholder = getMessage(messageKey);
  }

  document.title = getMessage('title');
  setMessage('auth-label');
  setMessage('auth-password-label', 'auth-password');
  setMessage('main-label', 'attrib-label');
  setMessage('main-site-label', 'site-label');
  setPlaceholder('main-site', 'site-placeholder');
  setMessage('main-page-label', 'page-label');
  setPlaceholder('main-page', 'page-placeholder');
  setMessage('main-fetch', 'page-fetch');
  setMessage('admin-label');
  setMessage('admin-password-label', 'admin-password');
  setMessage('admin-radio-regular-label', 'password-type-regular');
  setMessage('admin-radio-admin-label', 'password-type-admin');
  setMessage('admin-oldpassword-label', 'old-password');
  setMessage('admin-newpassword-label', 'new-password');
  setMessage('admin-change-password');
  setMessage('info-source');
}

function initializeHooks() {
  let element;

  element = document.getElementById('auth-password');
  element.addEventListener('input', debounce(mainPasswordCheck, 500));

  element = document.getElementById('main-site');
  element.addEventListener('input', debounce(siteCheck, 500));

  element = document.getElementById('main-fetch');
  element.addEventListener('click', fetchPage);

  element = document.getElementById('admin-password');
  element.addEventListener('input', debounce(adminPasswordCheck, 500));

  // TODO
}

function setup() {
  const url = new URL(window.location.href);
  const parameters = new URLSearchParams(url.search);
  language = parameters.get('lang');
  const site = parameters.get('site');

  if (!language) {
    fatalError('No language set', 'Parameter is "lang". Use "en" for English.');
    return;
  }

  if (site) initializeSite(site);
  initializeMessages();
  initializeHooks();
}

setTimeout(setup, 5);
