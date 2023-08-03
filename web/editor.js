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
    'page-parameters-missing': 'Both site and page must be specified',
    'page-missing': 'Page not found in Crom',
    'page-fetch': 'Fetch',
    'page-save': 'Save',
    'attribution-none': 'No attributions',
    'attribution-author': 'Author',
    'attribution-rewrite': 'Rewrite',
    'attribution-translator': 'Translator',
    'attribution-maintainer': 'Maintainer',
    'field-attribution-type': 'Type',
    'field-user-name': 'User name',
    'field-user-id': 'User ID',
    'field-date': 'Date',
    'admin-label': 'Administration',
    'admin-password': 'Admin Password',
    'admin-change-password': 'Change password',
    'password-type-regular': 'Regular',
    'password-type-admin': 'Admin',
    'old-password': 'Old Password',
    'new-password': 'New Password',
    'confirm-password': 'Confirm Password',
    'change-password': 'Change Password',
    'success': 'Success',
    'error-password': 'Invalid password',
    'error-password-site': 'Need site to check password',
    'error-site': 'Invalid site',
    'error-site-fatal': 'Unknown site: ',
    'error-site-fatal-secondary': 'Pass in a site slug or INT language code',
    'error-password-type-selected': 'No password type selected',
    'error-password-mismatch': 'Passwords do not match',
    'error-password-empty': 'Password cannot be empty',
    'error-password-set': 'Error setting password',
    'info-viewer': 'viewer',
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
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
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

function queryAttrib(method, route, data = null) {
  let body = undefined;
  if (method === 'HEAD' || method === 'GET') {
    if (data) {
      route += '?' + new URLSearchParams(data);
    }
  } else {
    body = JSON.stringify(data);
  }

  const request = new Request(ATTRIB_ENDPOINT + route, {
    keepalive: true,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body,
  });

  return fetch(request);
}

async function checkPassword(type, site, password) {
  const response = await queryAttrib('PUT', '/password/check', { site, password, type });
  return response.status === 200;
}

async function updatePassword(type, site, adminPassword, oldPassword, newPassword) {
  const response = await queryAttrib('PUT', '/password/update', {
    site,
    type,
    admin_password: adminPassword,
    old_password: oldPassword,
    new_password: newPassword,
  });
  return response.status === 200;
}

async function getPageAttribution(site, page) {
  const response = await queryAttrib('GET', '/attribution/page', { site, page });
  return response.json();
}

async function setPageAttribution(site, page, pasword, attributions) {
  await queryAttrib('PUT', '/attribution/page', { site, page, password, attributions });
}

// Handlers

function buildPasswordCheck(type, errorId) {
  return async function check(event) {
    const errorElement = document.getElementById(errorId);

    // Check password in API, or clear error if input is empty.
    let valid = true;
    if (event.target.value) {
      const site = document.getElementById('main-site').value;
      if (!site) {
        // Need to pass in a site
        errorElement.innerText = getMessage('error-password-site');
        return;
      }

      valid = await checkPassword(type, site, event.target.value);
    }

    errorElement.innerText = valid ? '' : getMessage('error-password');
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

async function fetchPageCrom(siteSlug, pageSlug) {
  const pageInfo = await getPageInfo(siteSlug, pageSlug);

  const element = document.getElementById('main-status');
  deleteChildren(element);

  if (pageInfo === null) {
    element.classList = ['error'];
    element.innerText = getMessage('page-missing');
  } else {
    element.classList = [];
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
}

async function fetchPageAttrib(siteSlug, pageSlug) {
  const element = document.getElementById('attrib');
  const attributions = await getPageAttribution(siteSlug, pageSlug);

  deleteChildren(element);

  if (attributions === null || attributions.length === 0) {
    const label = document.createElement('label');
    label.innerText = getMessage('attribution-none');
    element.appendChild(label);
    return;
  }

  function buildAttribution(attribution) {
    function buildAttributionType() {
      const container = document.createElement('div');
      container.classList = ['row'];

      const label = document.createElement('label');
      label.innerText = getMessage('field-attribution-type');
      container.appendChild(label);

      const selector = document.createElement('select');

      const option1 = document.createElement('option');
      option1.innerText = getMessage('attribution-author');
      option1.value = 'author';
      selector.appendChild(option1);

      const option2 = document.createElement('option');
      option2.innerText = getMessage('attribution-rewrite');
      option2.value = 'rewrite';
      selector.appendChild(option2);

      const option3 = document.createElement('option');
      option3.innerText = getMessage('attribution-translator');
      option3.value = 'translator';
      selector.appendChild(option3);

      const option4 = document.createElement('option');
      option4.innerText = getMessage('attribution-maintainer');
      option4.value = 'maintainer';
      selector.appendChild(option4);

      selector.value = attribution.type;
      container.appendChild(selector);
      return container;
    }

    function buildUserName() {
      const container = document.createElement('div');
      container.classList = ['row'];

      const label = document.createElement('label');
      label.innerText = getMessage('field-user-name');
      container.appendChild(label);

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Moto42';
      input.value = attribution.user_name;
      container.appendChild(input);

      return container;
    }

    function buildUserId() {
      const container = document.createElement('div');
      container.classList = ['row'];

      const label = document.createElement('label');
      label.innerText = getMessage('field-user-id');
      container.appendChild(label);

      const input = document.createElement('input');
      input.type = 'number';
      input.min = 1;
      input.value = attribution.user_id;
      container.appendChild(input);

      return container;
    }

    function buildDate() {
      const container = document.createElement('div');
      container.classList = ['row'];

      const label = document.createElement('label');
      label.innerText = getMessage('field-date');
      container.appendChild(label);

      const date = document.createElement('input');
      date.type = 'date';
      date.value = attribution.date;
      container.appendChild(date);

      return container;
    }

    const attribElement = document.createElement('fieldset');
    attribElement.classList = ['attrib-entry'];
    attribElement.appendChild(buildAttributionType());
    attribElement.appendChild(buildUserName());
    attribElement.appendChild(buildUserId());
    attribElement.appendChild(buildDate());

    // TODO add handlers

    return attribElement;
  }

  for (const attribution of attributions) {
    element.appendChild(buildAttribution(attribution));
  }

  const saveButton = document.createElement('button');
  saveButton.innerText = getMessage('page-save');
  // TODO add handler
  element.appendChild(saveButton);
}

async function fetchPage(event) {
  const siteSlug = document.getElementById('main-site').value;
  const pageSlug = document.getElementById('main-page').value;
  if (!siteSlug && !pageSlug) {
    const element = document.getElementById('main-status');
    element.classList = ['error'];
    element.innerText = getMessage('page-parameters-missing');
    return;
  }

  await Promise.all([
    fetchPageCrom(siteSlug, pageSlug),
    fetchPageAttrib(siteSlug, pageSlug),
  ]);
}

async function handleChangePassword(event) {
  const element = document.getElementById('admin-change-password-label');
  const typeRadio = document.querySelector('input[name="password-type"]:checked');
  if (typeRadio === null) {
    // No radio button selected
    document.getElementById().innerText = getMessage('error-pasword-type-selected');
    return;
  }
  const type = typeRadio.value;

  const site = document.getElementById('main-site').value;
  if (!site) {
    // Need to pass in a site
    element.classList = ['error'];
    element.innerText = getMessage('error-password-site');
    return;
  }

  const adminPassword = document.getElementById('admin-password').value;
  const oldPassword = document.getElementById('admin-oldpassword').value;
  const newPassword = document.getElementById('admin-newpassword').value;
  const confirmPassword = document.getElementById('admin-confirmpassword').value;

  if (!adminPassword || !oldPassword || !newPassword) {
    // Don't attempt if any fields are empty
    element.classList = ['error'];
    element.innerText = getMessage('error-password-empty');
    return;
  }

  if (newPassword !== confirmPassword) {
    // Ensure they match
    element.classList = ['error'];
    element.innerText = getMessage('error-password-mismatch');
    return;
  }

  const success = await updatePassword(type, site, adminPassword, oldPassword, newPassword);

  if (success) {
    element.classList = ['success'];
    element.innerText = getMessage('success');

    // Wipe input fields to disallow double-pressing
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-oldpassword').value = '';
    document.getElementById('admin-newpassword').value = '';
    document.getElementById('admin-confirmpassword').value = '';
  } else {
    element.classList = ['error'];
    element.innerText = getMessage('error-password-set');
  }
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

// Initialization

function initializeSite(inputSite) {
  site = getSiteSlug(inputSite);
  if (site === null) {
    fatalError(
      getMessage('error-site-fatal') + inputSite,
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
  setMessage('admin-old-password-label', 'old-password');
  setMessage('admin-new-password-label', 'new-password');
  setMessage('admin-confirm-password-label', 'confirm-password');
  setMessage('admin-change-password', 'change-password');
  setMessage('info-viewer');
  document.getElementById('info-viewer').href = `https://scpwiki.github.io/attribution-metadata/viewer.html?lang=${language}`;
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

  element = document.getElementById('admin-change-password');
  element.addEventListener('click', handleChangePassword);

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
