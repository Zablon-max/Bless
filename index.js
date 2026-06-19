// BLESSINGS FAMILY APP — Firebase Version
// Real-time shared data for all family members

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---- FIREBASE CONFIG ----
const firebaseConfig = {
  apiKey: "AIzaSyA0DyUHYM4tO5e7ZRBfPeTOWnBQQYvpUaw",
  authDomain: "blessings-945ed.firebaseapp.com",
  projectId: "blessings-945ed",
  storageBucket: "blessings-945ed.firebasestorage.app",
  messagingSenderId: "630272841264",
  appId: "1:630272841264:web:e01613a199832cf735bff5"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ---- MEMBER ----
var member = localStorage.getItem('bl-member') || '';
var emoji  = localStorage.getItem('bl-emoji')  || '👤';

if (member) {
  document.getElementById('active-name').textContent  = member;
  document.getElementById('active-emoji').textContent = emoji;
  document.querySelectorAll('.mbtn').forEach(function(b) {
    if (b.getAttribute('data-name') === member) b.classList.add('active');
  });
}

document.querySelectorAll('.mbtn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    member = btn.getAttribute('data-name');
    emoji  = btn.getAttribute('data-emoji');
    localStorage.setItem('bl-member', member);
    localStorage.setItem('bl-emoji',  emoji);
    document.getElementById('active-name').textContent  = member;
    document.getElementById('active-emoji').textContent = emoji;
    document.querySelectorAll('.mbtn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });
});

// ---- TABS ----
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('page-' + tab.getAttribute('data-tab')).classList.add('active');
  });
});

// ---- CHAT ENTER KEY ----
document.getElementById('in-chat').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') sendChat();
});

// ---- HELPERS ----
function requireMember() {
  if (!member) { alert('Tap your name first!'); return false; }
  return true;
}

function toggleForm(id) {
  var f = document.getElementById(id);
  f.style.display = (f.style.display === 'flex') ? 'none' : 'flex';
}

function setStatus(msg, ok) {
  var bar = document.getElementById('status-bar');
  var txt = document.getElementById('status-text');
  txt.textContent = msg;
  bar.style.background = ok ? 'rgba(76,175,80,0.15)' : 'rgba(201,168,76,0.1)';
  if (ok) {
    setTimeout(function() { bar.style.display = 'none'; }, 3000);
  }
}

function now() {
  var d = new Date();
  return d.toLocaleDateString('en-KE', { day:'numeric', month:'short' })
    + ' ' + d.toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' });
}

// ---- NOTICES ----
async function saveNotice() {
  if (!requireMember()) return;
  var text = document.getElementById('in-notices').value.trim();
  if (!text) return;
  try {
    await addDoc(collection(db, 'notices'), {
      text: text, by: member, emoji: emoji, time: now(), createdAt: serverTimestamp()
    });
    document.getElementById('in-notices').value = '';
    document.getElementById('form-notices').style.display = 'none';
  } catch(e) { alert('Error saving: ' + e.message); }
}

onSnapshot(query(collection(db, 'notices'), orderBy('createdAt', 'desc')), function(snap) {
  setStatus('✅ Connected to family data', true);
  var el = document.getElementById('list-notices');
  if (snap.empty) { el.innerHTML = '<div class="empty"><span class="empty-icon">📢</span>No announcements yet.</div>'; return; }
  el.innerHTML = snap.docs.map(function(d) {
    var i = d.data();
    return '<div class="card">'
      + '<p class="card-text">' + i.text + '</p>'
      + '<div class="card-meta"><span>' + (i.emoji||'👤') + ' ' + i.by + '</span><span>🕐 ' + i.time + '</span></div>'
      + '<div class="card-actions"><button onclick="delDoc(\'notices\',\'' + d.id + '\')">🗑️</button></div>'
      + '</div>';
  }).join('');
}, function(err) { setStatus('⚠️ Connection error: ' + err.message, false); });

// ---- CHORES ----
async function saveChore() {
  if (!requireMember()) return;
  var text = document.getElementById('in-chore').value.trim();
  var who  = document.getElementById('in-chore-who').value;
  if (!text) return;
  try {
    await addDoc(collection(db, 'chores'), {
      text: text, who: who, by: member, emoji: emoji, time: now(), done: false, createdAt: serverTimestamp()
    });
    document.getElementById('in-chore').value = '';
    document.getElementById('form-chores').style.display = 'none';
  } catch(e) { alert('Error saving: ' + e.message); }
}

async function tickChore(id, done) {
  await updateDoc(doc(db, 'chores', id), { done: !done });
}

onSnapshot(query(collection(db, 'chores'), orderBy('createdAt', 'desc')), function(snap) {
  var el = document.getElementById('list-chores');
  if (snap.empty) { el.innerHTML = '<div class="empty"><span class="empty-icon">✅</span>No chores yet.</div>'; return; }
  el.innerHTML = snap.docs.map(function(d) {
    var i = d.data();
    return '<div class="card ' + (i.done ? 'done' : '') + '">'
      + '<p class="card-text">' + i.text + '</p>'
      + '<div class="card-meta"><span class="tag">👤 ' + i.who + '</span><span>By ' + i.by + '</span><span>🕐 ' + i.time + '</span></div>'
      + '<div class="card-actions">'
      + '<button onclick="tickChore(\'' + d.id + '\',' + i.done + ')">' + (i.done ? '↩️' : '✔️') + '</button>'
      + '<button onclick="delDoc(\'chores\',\'' + d.id + '\')">🗑️</button>'
      + '</div></div>';
  }).join('');
});

// ---- BUDGET ----
async function saveBudget() {
  if (!requireMember()) return;
  var desc   = document.getElementById('in-bdesc').value.trim();
  var amount = parseFloat(document.getElementById('in-bamount').value);
  var type   = document.getElementById('in-btype').value;
  if (!desc || isNaN(amount) || amount <= 0) { alert('Enter a description and valid amount.'); return; }
  try {
    await addDoc(collection(db, 'budget'), {
      desc: desc, amount: amount, type: type, by: member, emoji: emoji, time: now(), createdAt: serverTimestamp()
    });
    document.getElementById('in-bdesc').value   = '';
    document.getElementById('in-bamount').value = '';
    document.getElementById('form-budget').style.display = 'none';
  } catch(e) { alert('Error saving: ' + e.message); }
}

onSnapshot(query(collection(db, 'budget'), orderBy('createdAt', 'desc')), function(snap) {
  var el = document.getElementById('list-budget');
  var inc = 0, exp = 0;
  snap.docs.forEach(function(d) {
    var i = d.data();
    if (i.type === 'income') inc += i.amount; else exp += i.amount;
  });
  var bal = inc - exp;
  document.getElementById('t-income').textContent  = 'Ksh ' + inc.toLocaleString();
  document.getElementById('t-expense').textContent = 'Ksh ' + exp.toLocaleString();
  document.getElementById('t-balance').textContent = 'Ksh ' + bal.toLocaleString();
  document.getElementById('t-balance').style.color = bal >= 0 ? 'var(--gold)' : 'var(--red)';
  if (snap.empty) { el.innerHTML = '<div class="empty"><span class="empty-icon">💰</span>No records yet.</div>'; return; }
  el.innerHTML = snap.docs.map(function(d) {
    var i = d.data();
    var isInc = i.type === 'income';
    return '<div class="card ' + (isInc ? 'inc' : 'exp') + '">'
      + '<p class="card-text">' + i.desc + '</p>'
      + '<div class="card-meta">'
      + '<span class="' + (isInc ? 'green' : 'red') + '"><b>' + (isInc ? '+' : '-') + ' Ksh ' + i.amount.toLocaleString() + '</b></span>'
      + '<span>👤 ' + i.by + '</span><span>🕐 ' + i.time + '</span>'
      + '</div>'
      + '<div class="card-actions"><button onclick="delDoc(\'budget\',\'' + d.id + '\')">🗑️</button></div>'
      + '</div>';
  }).join('');
});

// ---- PRAYER ----
async function savePrayer() {
  if (!requireMember()) return;
  var text = document.getElementById('in-prayer').value.trim();
  if (!text) return;
  try {
    await addDoc(collection(db, 'prayer'), {
      text: text, by: member, emoji: emoji, time: now(), answered: false, createdAt: serverTimestamp()
    });
    document.getElementById('in-prayer').value = '';
    document.getElementById('form-prayer').style.display = 'none';
  } catch(e) { alert('Error saving: ' + e.message); }
}

async function tickPrayer(id, answered) {
  await updateDoc(doc(db, 'prayer', id), { answered: !answered });
}

onSnapshot(query(collection(db, 'prayer'), orderBy('createdAt', 'desc')), function(snap) {
  var el = document.getElementById('list-prayer');
  if (snap.empty) { el.innerHTML = '<div class="empty"><span class="empty-icon">🙏</span>No prayer requests yet.</div>'; return; }
  el.innerHTML = snap.docs.map(function(d) {
    var i = d.data();
    return '<div class="card prayer-card ' + (i.answered ? 'answered' : '') + '">'
      + '<p class="card-text">' + i.text + '</p>'
      + '<div class="card-meta"><span>🙏 ' + i.by + '</span><span>🕐 ' + i.time + '</span>'
      + (i.answered ? '<span class="tag">✅ Answered!</span>' : '') + '</div>'
      + '<div class="card-actions">'
      + '<button onclick="tickPrayer(\'' + d.id + '\',' + i.answered + ')">🙌</button>'
      + '<button onclick="delDoc(\'prayer\',\'' + d.id + '\')">🗑️</button>'
      + '</div></div>';
  }).join('');
});

// ---- EVENTS ----
async function saveEvent() {
  if (!requireMember()) return;
  var title = document.getElementById('in-etitle').value.trim();
  var date  = document.getElementById('in-edate').value;
  var note  = document.getElementById('in-enote').value.trim();
  if (!title || !date) { alert('Enter event name and date.'); return; }
  try {
    await addDoc(collection(db, 'events'), {
      title: title, date: date, note: note, by: member, emoji: emoji, createdAt: serverTimestamp()
    });
    document.getElementById('in-etitle').value = '';
    document.getElementById('in-edate').value  = '';
    document.getElementById('in-enote').value  = '';
    document.getElementById('form-events').style.display = 'none';
  } catch(e) { alert('Error saving: ' + e.message); }
}

onSnapshot(query(collection(db, 'events'), orderBy('date', 'asc')), function(snap) {
  var el = document.getElementById('list-events');
  if (snap.empty) { el.innerHTML = '<div class="empty"><span class="empty-icon">📅</span>No events yet.</div>'; return; }
  el.innerHTML = snap.docs.map(function(d) {
    var i = d.data();
    var formatted = new Date(i.date).toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'long', year:'numeric' });
    return '<div class="card">'
      + '<p class="card-text">' + i.title + '</p>'
      + (i.note ? '<p style="font-size:0.79rem;color:var(--muted);margin-bottom:6px">' + i.note + '</p>' : '')
      + '<div class="card-meta"><span class="date-badge">📅 ' + formatted + '</span><span>By ' + i.by + '</span></div>'
      + '<div class="card-actions"><button onclick="delDoc(\'events\',\'' + d.id + '\')">🗑️</button></div>'
      + '</div>';
  }).join('');
});

// ---- CHAT ----
async function sendChat() {
  if (!requireMember()) return;
  var text = document.getElementById('in-chat').value.trim();
  if (!text) return;
  try {
    await addDoc(collection(db, 'chat'), {
      text: text, by: member, emoji: emoji, time: now(), createdAt: serverTimestamp()
    });
    document.getElementById('in-chat').value = '';
  } catch(e) { alert('Error sending: ' + e.message); }
}

onSnapshot(query(collection(db, 'chat'), orderBy('createdAt', 'asc')), function(snap) {
  var box = document.getElementById('chat-box');
  if (snap.empty) { box.innerHTML = '<div class="empty"><span class="empty-icon">💬</span>No messages yet. Say hello! 👋</div>'; return; }
  box.innerHTML = snap.docs.map(function(d) {
    var m  = d.data();
    var me = m.by === member;
    return '<div class="msg ' + (me ? 'me' : 'them') + '">'
      + (!me ? '<span class="msg-sender">' + m.emoji + ' ' + m.by + '</span>' : '')
      + '<div class="bubble">' + m.text + '</div>'
      + '<span class="msg-time">' + m.time + '</span>'
      + '</div>';
  }).join('');
  box.scrollTop = box.scrollHeight;
});

// ---- DELETE ----
async function delDoc(col, id) {
  try {
    await deleteDoc(doc(db, col, id));
  } catch(e) { alert('Error deleting: ' + e.message); }
}

// make functions available globally for onclick handlers
window.saveNotice  = saveNotice;
window.saveChore   = saveChore;
window.tickChore   = tickChore;
window.saveBudget  = saveBudget;
window.savePrayer  = savePrayer;
window.tickPrayer  = tickPrayer;
window.saveEvent   = saveEvent;
window.sendChat    = sendChat;
window.delDoc      = delDoc;
window.toggleForm  = toggleForm;