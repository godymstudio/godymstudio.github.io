const DB_KEY = 'godym_v31';
const MAX_CHAPTERS = 50;
const MAX_PHOTOS = 2;
const WARN_CHARS = 45000;
const MAX_CHARS = 50000;
const MAX_PHOTO_WIDTH = 800; // Q5: Photo resize speed up

let db = { subject: 'General', fontSize: 16, chapters: [{id: 1, name: 'Chapter 1', text: '', photos: []}], currentId: 1 };
let pressTimer = null;
let isLongPress = false; // FIX 1: Longpress flag

const $ = id => document.getElementById(id);
const toast = msg => {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
};

function loadDB() {
  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    db = JSON.parse(saved);
    if (!db.subject) db.subject = 'General';
  }
}

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getCurrentChapter() {
  return db.chapters.find(c => c.id === db.currentId);
}

function render() {
  $('subjectName').textContent = db.subject;
  
  // Q3: Chapters - FIX 1: Longpress vs Click then hran
  const chDiv = $('chapters');
  chDiv.innerHTML = '';
  db.chapters.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'chapter-btn' + (ch.id === db.currentId? ' active' : '');
    btn.textContent = ch.name;
    
    // FIX 1: Longpress logic thar
    const startPress = (e) => {
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        renameChapter(ch.id);
      }, 500);
    };
    const endPress = () => {
      clearTimeout(pressTimer);
    };
    const handleClick = () => {
      if (!isLongPress) switchChapter(ch.id); // Longpress nilo chiah switch
    };
    
    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('mouseup', endPress);
    btn.addEventListener('mouseleave', endPress);
    btn.addEventListener('touchstart', startPress);
    btn.addEventListener('touchend', endPress);
    btn.addEventListener('click', handleClick);
    
    chDiv.appendChild(btn);
  });
  
  if (db.chapters.length < MAX_CHAPTERS) {
    const addBtn = document.createElement('button');
    addBtn.className = 'chapter-btn add';
    addBtn.textContent = '+ Add';
    addBtn.onclick = addChapter;
    chDiv.appendChild(addBtn);
  }
  
  const ch = getCurrentChapter();
  $('noteArea').value = ch.text;
  $('noteArea').style.fontSize = db.fontSize + 'px';
  
  const phDiv = $('photos');
  phDiv.innerHTML = '';
  ch.photos.forEach((photo, idx) => {
    const item = document.createElement('div');
    item.className = 'photo-item';
    item.innerHTML = `<img src="${photo}"><button class="photo-del">X</button>`;
    item.querySelector('.photo-del').onclick = () => deletePhoto(idx);
    phDiv.appendChild(item);
  });
  
  $('cameraBtn').disabled = ch.photos.length >= MAX_PHOTOS;
  updateCharCount();
}

function switchChapter(id) {
  if (id === db.currentId) return; // A in ang chuan switch lo
  saveCurrentText();
  db.currentId = id;
  render();
}

function addChapter() {
  if (db.chapters.length >= MAX_CHAPTERS) return toast(`Max ${MAX_CHAPTERS} chapters`);
  saveCurrentText();
  const newId = Math.max(...db.chapters.map(c => c.id)) + 1;
  db.chapters.push({id: newId, name: `Chapter ${newId}`, text: '', photos: []});
  db.currentId = newId;
  saveDB();
  render();
  toast('Chapter added');
}

function renameChapter(id) {
  const ch = db.chapters.find(c => c.id === id);
  const newName = prompt('Enter new chapter name:', ch.name);
  if (newName && newName.trim()) {
    ch.name = newName.trim().substring(0, 20);
    saveDB();
    render();
    toast('Chapter renamed');
  }
}

function renameSubject() {
  const newName = prompt('Enter new subject name:', db.subject);
  if (newName && newName.trim()) {
    db.subject = newName.trim().substring(0, 30);
    saveDB();
    render();
    toast('Subject renamed');
  }
}

function deleteChapter() {
  if (db.chapters.length === 1) return toast('Cannot delete last chapter');
  if (!confirm('Delete this chapter? This cannot be undone.')) return;
  db.chapters = db.chapters.filter(c => c.id!== db.currentId);
  db.currentId = db.chapters[0].id;
  saveDB();
  render();
  toast('Chapter deleted');
}

function saveCurrentText() {
  const ch = getCurrentChapter();
  ch.text = $('noteArea').value;
}

function saveNote() {
  saveCurrentText();
  saveDB();
  toast('Saved ✓');
}

function updateCharCount() {
  const len = $('noteArea').value.length;
  const el = $('charCount');
  el.textContent = `${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()} chars`;
  el.className = len > MAX_CHARS? 'danger' : len > WARN_CHARS? 'warn' : '';
  if (len > MAX_CHARS) toast('Character limit exceeded! Please create new chapter.');
}

function copyText() {
  const text = $('noteArea').value;
  if (!text) return toast('Nothing to copy');
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard'));
}

function shareText() {
  const ch = getCurrentChapter();
  const text = `GODYM NOTE\nSubject: ${db.subject}\nChapter: ${ch.name}\n\n${ch.text}`;
  if (navigator.share) {
    navigator.share({ title: 'GODYM Note', text: text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => toast('Copied. Paste to share'));
  }
}

// FIX 2: Photo compress - a muang lo
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_PHOTO_WIDTH) {
        height = height * (MAX_PHOTO_WIDTH / width);
        width = MAX_PHOTO_WIDTH;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      // 0.7 quality = size 70% tlem, quality tha tho
      callback(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

$('cameraBtn').onclick = () => $('cameraInput').click();
$('cameraInput').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const ch = getCurrentChapter();
  if (ch.photos.length >= MAX_PHOTOS) return toast(`Max ${MAX_PHOTOS} photos per chapter`);
  
  toast('Processing photo...');
  compressImage(file, (compressed) => {
    ch.photos.push(compressed);
    saveDB();
    render();
    toast('Photo added');
  });
  e.target.value = '';
};

function deletePhoto(idx) {
  if (!confirm('Delete this photo?')) return;
  const ch = getCurrentChapter();
  ch.photos.splice(idx, 1);
  saveDB();
  render();
  toast('Photo deleted');
}

$('fontUp').onclick = () => {
  if (db.fontSize < 24) {
    db.fontSize += 2;
    saveDB();
    render();
  }
};
$('fontDown').onclick = () => {
  if (db.fontSize > 12) {
    db.fontSize -= 2;
    saveDB();
    render();
  }
};

$('editSubjectBtn').onclick = renameSubject;
$('editChapterBtn').onclick = () => renameChapter(db.currentId);
$('copyBtn').onclick = copyText;
$('shareBtn').onclick = shareText;
$('saveBtn').onclick = saveNote;
$('deleteBtn').onclick = deleteChapter;
$('noteArea').oninput = updateCharCount;

loadDB();
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}