const tabText = document.getElementById('tabText');
const tabPdf = document.getElementById('tabPdf');
const viewText = document.getElementById('viewText');
const viewPdf = document.getElementById('viewPdf');
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const submitBtn = document.getElementById('submitBtn');
const loadingUI = document.getElementById('loadingUI');
const errorBox = document.getElementById('errorBox');
const accessCodeWrapper = document.getElementById('accessCodeWrapper');
const accessCodeInput = document.getElementById('accessCodeInput');
const resultSection = document.getElementById('resultSection');
const copyBtn = document.getElementById('copyBtn');

let currentMode = 'text';
let currentFile = null;
let currentResultData = null;

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium toast-enter-active';
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.replace('toast-enter-active', 'toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

tabText.addEventListener('click', () => {
  currentMode = 'text';
  tabText.className = 'pb-3 px-4 tab-active w-1/2 text-center transition-colors';
  tabPdf.className = 'pb-3 px-4 tab-inactive w-1/2 text-center transition-colors hover:text-emerald-600';
  viewText.classList.remove('hidden');
  viewPdf.classList.add('hidden');
});
tabPdf.addEventListener('click', () => {
  currentMode = 'pdf';
  tabPdf.className = 'pb-3 px-4 tab-active w-1/2 text-center transition-colors';
  tabText.className = 'pb-3 px-4 tab-inactive w-1/2 text-center transition-colors hover:text-emerald-600';
  viewPdf.classList.remove('hidden');
  viewText.classList.add('hidden');
});

textInput.addEventListener('input', () => {
  charCount.textContent = textInput.value.length;
});

function handleFileSelect(file) {
  if (!file) return;
  if (file.type !== 'application/pdf') {
    showToast('PDF 파일만 업로드할 수 있습니다.');
    resetFile();
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    showToast('4MB 이하의 PDF만 업로드할 수 있습니다.');
    resetFile();
    return;
  }
  currentFile = file;
  fileNameDisplay.textContent = file.name;
  fileInfo.classList.remove('hidden');
  showToast('PDF 파일이 준비되었습니다.');
}

function resetFile() {
  currentFile = null;
  fileInput.value = '';
  fileInfo.classList.add('hidden');
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('bg-emerald-50', 'border-emerald-500');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('bg-emerald-50', 'border-emerald-500');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('bg-emerald-50', 'border-emerald-500');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
});

function resetUI() {
  errorBox.classList.add('hidden');
  resultSection.classList.add('hidden');
  loadingUI.classList.remove('hidden');
  submitBtn.disabled = true;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

submitBtn.addEventListener('click', async () => {
  if (currentMode === 'text' && !textInput.value.trim()) {
    showToast('분석할 텍스트를 입력해 주세요.');
    return;
  }
  if (currentMode === 'pdf' && !currentFile) {
    showToast('먼저 PDF 파일을 업로드해 주세요.');
    return;
  }

  resetUI();
  let accessCode = accessCodeInput.value || sessionStorage.getItem('accessCode') || '';

  try {
    const headers = {};
    if (accessCode) headers['x-access-code'] = accessCode;

    let bodyData;
    if (currentMode === 'text') {
      headers['Content-Type'] = 'application/json';
      bodyData = JSON.stringify({ text: textInput.value });
    } else {
      headers['Content-Type'] = 'application/octet-stream';
      bodyData = currentFile;
    }

    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: headers,
      body: bodyData
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.code === 'ACCESS_CODE_REQUIRED') {
        sessionStorage.removeItem('accessCode');
        accessCodeWrapper.classList.remove('hidden');
        accessCodeInput.focus();
        showError(data.error);
        return;
      }
      showError(data.error || `요청에 실패했습니다. (${response.status})`);
      return;
    }

    if (accessCode) sessionStorage.setItem('accessCode', accessCode);
    renderResults(data);
    
  } catch (error) {
    showError('네트워크 또는 서버 오류가 발생했습니다.');
  } finally {
    loadingUI.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

function renderList(elementId, items, badgeColor) {
  const ul = document.getElementById(elementId);
  ul.replaceChildren();
  (items || []).forEach((text, i) => {
    const li = document.createElement('li');
    li.className = 'flex items-start gap-3 bg-gray-50 p-3 rounded-lg';
    
    const badge = document.createElement('span');
    badge.className = `flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold mt-0.5 ${badgeColor}`;
    badge.textContent = i + 1;
    
    const p = document.createElement('p');
    p.className = 'text-gray-700 leading-relaxed font-medium';
    p.textContent = text;
    
    li.appendChild(badge);
    li.appendChild(p);
    ul.appendChild(li);
  });
}

function renderResults(data) {
  currentResultData = data;
  renderList('resLevel1', data.level1_factual, 'bg-blue-100 text-blue-700');
  renderList('resLevel2', data.level2_inferential, 'bg-purple-100 text-purple-700');
  renderList('resLevel3', data.level3_creative, 'bg-orange-100 text-orange-700');

  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

copyBtn.addEventListener('click', async () => {
  if (!currentResultData) return;
  const formatter = (arr) => (arr || []).map((t, i) => `${i + 1}. ${t}`).join('\n');
  const textToCopy = `[1단계: 사실 확인 질문]\n${formatter(currentResultData.level1_factual)}\n\n[2단계: 추론 및 비판적 사고 질문]\n${formatter(currentResultData.level2_inferential)}\n\n[3단계: 창의적 적용 및 토의 질문]\n${formatter(currentResultData.level3_creative)}`;
  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast('전체 질문 세트가 복사되었습니다!');
  } catch (err) {
    showToast('복사에 실패했습니다. 직접 복사해 주세요.');
  }
});