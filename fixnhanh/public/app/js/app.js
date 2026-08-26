// FixNhanh PWA — vanilla JS SPA
const API_BASE = '/api';

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  ws: null
};

const DISTRICTS = {
  'quan-1':'Quận 1','quan-2':'Quận 2','quan-3':'Quận 3','quan-4':'Quận 4','quan-5':'Quận 5',
  'quan-6':'Quận 6','quan-7':'Quận 7','quan-8':'Quận 8','quan-9':'Quận 9','quan-10':'Quận 10',
  'quan-11':'Quận 11','quan-12':'Quận 12','binh-thanh':'Bình Thạnh','go-vap':'Gò Vấp',
  'tan-binh':'Tân Bình','tan-phu':'Tân Phú','phu-nhuan':'Phú Nhuận','thu-duc':'Thủ Đức'
};
const SKILLS = {dien:'Điện',nuoc:'Nước',moc:'Mộc','dien-lanh':'Điện lạnh',son:'Sơn','ve-sinh':'Vệ sinh'};
const ICONS = {dien:'⚡',nuoc:'💧',moc:'🔨','dien-lanh':'❄️',son:'🎨','ve-sinh':'🧹'};
const DISTRICT_CENTROIDS = {
  'quan-1':[10.7769,106.7009],'quan-2':[10.7890,106.7620],'quan-3':[10.7830,106.6930],'quan-4':[10.7560,106.7040],
  'quan-5':[10.7540,106.6670],'quan-6':[10.7440,106.6340],'quan-7':[10.7340,106.7220],'quan-8':[10.7280,106.6260],
  'quan-9':[10.8320,106.8330],'quan-10':[10.7750,106.6670],'quan-11':[10.7630,106.6290],'quan-12':[10.8620,106.6560],
  'binh-thanh':[10.8000,106.6900],'go-vap':[10.8300,106.6600],'tan-binh':[10.8020,106.6400],
  'tan-phu':[10.7940,106.6120],'phu-nhuan':[10.8000,106.6790],'thu-duc':[10.8560,106.7580]
};
const STATUS_LABELS = {active:'Đang hoạt động',blocked:'Đã khóa',finding:'Đang tìm thợ',offered:'Chờ xác nhận',accepted:'Đã nhận',in_progress:'Đang thực hiện',done:'Đã xong',paid:'Đã thanh toán',cancelled:'Đã hủy',open:'Đang mở',assigned:'Đã phân công',completed:'Đã hoàn tất',delivered:'Chờ xác nhận',awaiting_payment:'Chờ thanh toán',held:'Đang giữ tiền',released:'Đã giải ngân',refunded:'Đã hoàn tiền',pending:'Đang chờ',rejected:'Đã từ chối',created:'Mới tạo'};
const ICON_SVG = {home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>', jobs:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 12h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>', workers:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 20a6 6 0 0 1 12 0M15 12l6 6M18 9l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>', chat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4.5a2.5 2.5 0 0 1-2-2.5v-6.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>', notifications:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>', profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'};

function $(s,p){return (p||document).querySelector(s);}
function fmt(n){return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n);}
function fmtDate(iso){if(!iso)return '';const d=new Date(iso);return d.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function toast(msg){const t=document.createElement('div');t.className='toast show';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),200);},2500);}
function statusLabel(s){return STATUS_LABELS[s]||s||'Chưa cập nhật';}
function statusColor(s){const m={active:'#11875D',blocked:'#C93C46',finding:'#A66B00',offered:'#0B6CFF',accepted:'#11875D',in_progress:'#0B6CFF',done:'#11875D',paid:'#11875D',cancelled:'#C93C46',open:'#0B6CFF',assigned:'#0B6CFF',completed:'#11875D',delivered:'#11875D',awaiting_payment:'#A66B00',held:'#A66B00',released:'#11875D',refunded:'#C93C46',pending:'#A66B00',rejected:'#C93C46',created:'#62748A'};return m[s]||'#62748A';}
function statusBadge(s){return `<span style="background:${statusColor(s)};color:#fff;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap">${esc(statusLabel(s))}</span>`;}
function safeList(json,fallback=[]){if(Array.isArray(json))return json.map(String);try{const v=JSON.parse(json??'null');return Array.isArray(v)?v.map(String):fallback;}catch{return fallback;}}
function initials(name){return (String(name||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('')||'?').toUpperCase();}
function skeletonRows(n,h){let s='';for(let i=0;i<n;i++)s+=`<div class="card" style="height:${h}px"></div>`;return s;}
function fmtDay(iso){if(!iso)return '';const d=new Date(iso);if(isNaN(d))return esc(iso);return d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'});}

async function api(path,opts={}){
  const isFormData = opts.body instanceof FormData;
  const h = { ...(isFormData ? {} : {'Content-Type':'application/json'}), ...(opts.headers||{}) };
  if(state.token)h['Authorization']=`Bearer ${state.token}`;
  const res=await fetch(`${API_BASE}${path}`,{...opts,headers:h});
  if(res.status===401){logout();throw new Error('Unauthorized');}
  const d=res.status===204?null:await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(d?.error||'Request failed');
  return d;
}

function saveAuth(d){state.token=d.token;state.user=d.user;localStorage.setItem('token',d.token);localStorage.setItem('user',JSON.stringify(d.user));}
function logout(){state.token=null;state.user=null;localStorage.removeItem('token');localStorage.removeItem('user');location.hash='#/login';}

function shell(content,title='FixNhanh',showBack=false,showTabs=true){
  const hideTabs=['login','register'].some(h=>location.hash.startsWith(`#/${h}`));
  const back=showBack?`<button class="btn-icon" aria-label="Quay lại" onclick="history.back()">←</button>`:'';
  const tabs=(!hideTabs&&showTabs)?`<nav class="bottom-tabs" aria-label="Điều hướng chính"><a href="#/home" class="tab ${location.hash==='#/home'?'active':''}" ${location.hash==='#/home'?'aria-current="page"':''}>${ICON_SVG.home}<span>Trang chủ</span></a><a href="#/jobs" class="tab ${location.hash.startsWith('#/jobs')?'active':''}" ${location.hash.startsWith('#/jobs')?'aria-current="page"':''}>${ICON_SVG.jobs}<span>Công việc</span></a><a href="#/workers" class="tab ${location.hash.startsWith('#/workers')?'active':''}" ${location.hash.startsWith('#/workers')?'aria-current="page"':''}>${ICON_SVG.workers}<span>Thợ</span></a><a href="#/notifications" class="tab ${location.hash.startsWith('#/notifications')?'active':''}" ${location.hash.startsWith('#/notifications')?'aria-current="page"':''}>${ICON_SVG.notifications}<span>Thông báo</span></a><a href="#/profile" class="tab ${location.hash.startsWith('#/profile')||location.hash.startsWith('#/wallet')?'active':''}" ${location.hash.startsWith('#/profile')||location.hash.startsWith('#/wallet')?'aria-current="page"':''}>${ICON_SVG.profile}<span>Tôi</span></a></nav>`:'';
  return `<div class="app-root"><header class="top-bar">${back}<h1>${esc(title)}</h1></header><main class="page">${content}</main>${tabs}</div>`;
}

const routes={};

// AUTH
routes['/login']=async()=>shell(`<div style="max-width:360px;margin:0 auto"><div style="text-align:center;margin-bottom:24px"><div style="font-size:56px">🔧</div><h2 style="margin:8px 0 4px">FixNhanh</h2><p style="color:var(--muted)">Đăng nhập để tiếp tục</p></div><form id="loginForm"><input class="input" name="phone" placeholder="Số điện thoại" required/><input class="input" name="password" type="password" placeholder="Mật khẩu" required/><button class="btn btn-primary" type="submit">Đăng nhập</button></form><p style="text-align:center;margin-top:16px;color:var(--muted)">Chưa có tài khoản? <a href="#/register">Đăng ký</a></p><div style="margin-top:24px;display:flex;flex-direction:column;gap:8px"><button class="btn btn-outline demo-btn" data-phone="0900000001">🧑 Khách hàng demo</button><button class="btn btn-outline demo-btn" data-phone="0901111101">🔧 Thợ demo</button><button class="btn btn-outline demo-btn" data-phone="0900999999">🛡️ Admin demo</button></div></div>`,'Đăng nhập',false,false);
routes['/register']=async()=>{const workerInfo=`<div id="workerInfo" style="display:none;margin-top:16px;padding:14px;background:var(--surface-soft);border:1px solid var(--border);border-radius:var(--radius)"><p style="font-weight:700;margin-bottom:8px">Thông tin hồ sơ thợ</p><textarea class="input" name="reg_bio" rows="3" placeholder="Giới thiệu bản thân..."></textarea><label style="font-size:12px;color:var(--muted);margin-bottom:6px">Kỹ năng</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${Object.entries(SKILLS).map(([k,v])=>`<label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" name="reg_skills" value="${k}"/>${v}</label>`).join('')}</div><label style="font-size:12px;color:var(--muted);margin-bottom:6px">Khu vực làm việc</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${Object.entries(DISTRICTS).map(([k,v])=>`<label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" name="reg_districts" value="${k}"/>${v}</label>`).join('')}</div><input class="input" name="reg_years_exp" type="number" placeholder="Số năm kinh nghiệm"/></div>`;return shell(`<div style="max-width:360px;margin:0 auto"><div style="text-align:center;margin-bottom:24px"><div style="font-size:56px">🔧</div><h2 style="margin:8px 0 4px">Tạo tài khoản</h2><p style="color:var(--muted)">Bạn đang muốn tham gia với vai trò nào?</p></div><form id="regForm"><input class="input" name="phone" placeholder="Số điện thoại" required/><input class="input" name="name" placeholder="Họ tên" required/><input class="input" name="password" type="password" placeholder="Mật khẩu" required minlength="6"/><label style="font-size:12px;color:var(--muted);margin-bottom:6px">Vai trò</label><div style="display:flex;gap:10px;margin-bottom:16px"><label style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px;border:2px solid var(--border);border-radius:var(--radius);cursor:pointer"><input type="radio" name="role" value="customer" checked style="accent-color:var(--primary)"/><span style="font-size:28px">🧑</span><span style="font-weight:700">Khách hàng</span><span style="font-size:12px;color:var(--muted)">Đặt lịch sửa chữa</span></label><label style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px;border:2px solid var(--border);border-radius:var(--radius);cursor:pointer"><input type="radio" name="role" value="worker" style="accent-color:var(--primary)"/><span style="font-size:28px">🔧</span><span style="font-weight:700">Thợ</span><span style="font-size:12px;color:var(--muted)">Nhận việc trên hệ thống</span></label></div>${workerInfo}<button class="btn btn-primary" type="submit">Đăng ký</button></form><p style="text-align:center;margin-top:16px;color:var(--muted)">Đã có tài khoản? <a href="#/login">Đăng nhập</a></p></div>`,'Đăng ký',false,false);setTimeout(()=>{const radios=document.querySelectorAll('input[name="role"]');const info=document.getElementById('workerInfo');const toggle=()=>{if(info)info.style.display=(document.querySelector('input[name="role"]:checked')?.value==='worker')?'block':'none';};radios.forEach(r=>r.addEventListener('change',toggle));toggle();},0);};

// HOME
routes['/home']=async()=>{
  if(!state.user)return routes['/login']();
  const w=state.user.role==='worker';
  let h='';
  if(w){
    const bk=await api('/bookings?mine=1');const j=await api('/jobs?status=open');
    h+=`<h2 style="margin:0 0 12px">Lịch đặt</h2>`;
    if(!bk.length)h+=`<p style="color:var(--muted)">Chưa có lịch đặt</p>`;
    bk.forEach(b=>{
      const canRespond = b.worker_id===state.user.id && b.status==='offered';
      const canClaim = b.status==='finding';
      h+=`<div class="card" style="padding:12px">
        <div style="font-weight:700">${esc(b.address)} · ${DISTRICTS[b.district]||b.district}</div>
        <div style="font-size:12px;color:var(--muted)">${fmtDate(b.scheduled_at)} · <span style="color:${statusColor(b.status)}">${b.status}</span></div>
        ${canRespond?`<div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-primary accept-booking-btn" data-id="${b.id}" style="flex:1;padding:8px">Nhận</button><button class="btn btn-outline decline-booking-btn" data-id="${b.id}" style="flex:1;padding:8px">Từ chối</button></div>`:''}
        ${canClaim?`<button class="btn btn-primary claim-booking-btn" data-id="${b.id}" style="margin-top:8px;width:100%;padding:8px">Nhận lịch này</button>`:''}
      </div>`;
    });
    h+=`<h2 style="margin:24px 0 12px">Việc mới</h2>`;
    if(!j.length)h+=`<p style="color:var(--muted)">Không có việc mới</p>`;
    j.forEach(x=>h+=`<a href="#/jobs/${x.id}" class="card" style="display:block;text-decoration:none;color:inherit"><div style="font-weight:700">${esc(x.title)}</div><div style="font-size:12px;color:var(--muted)">${fmt(x.budget_min)}-${fmt(x.budget_max)}·${DISTRICTS[x.district]||x.district}</div></a>`);
  } else {
    const sv=await api('/services');const o=await api('/orders?mine=1');const wk=await api('/workers?sort=rating');
    h+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px">`;
    sv.forEach(s=>h+=`<a href="#/booking?service=${s.id}" class="card" style="text-align:center;text-decoration:none;color:inherit;padding:12px"><div style="font-size:28px">${ICONS[s.slug]||'🛠️'}</div><div style="font-weight:700;font-size:13px">${esc(s.name)}</div><div style="font-size:11px;color:var(--muted)">${fmt(s.base_price)}</div></a>`);
    h+=`</div>`;
    h+=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:24px"><div style="font-weight:700;margin-bottom:10px">Menu</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"><a href="#/jobs" class="card" style="text-align:center;text-decoration:none;color:inherit;padding:10px 6px;font-size:12px">📋 Công việc</a><a href="#/workers" class="card" style="text-align:center;text-decoration:none;color:inherit;padding:10px 6px;font-size:12px">👷 Thợ</a><a href="#/orders" class="card" style="text-align:center;text-decoration:none;color:inherit;padding:10px 6px;font-size:12px">🧾 Đơn hàng</a><a href="#/notifications" class="card" style="text-align:center;text-decoration:none;color:inherit;padding:10px 6px;font-size:12px">🔔 Thông báo</a><a href="#/profile" class="card" style="text-align:center;text-decoration:none;color:inherit;padding:10px 6px;font-size:12px">👤 Tôi</a><a href="#/wallet" class="card" style="text-align:center;text-decoration:none;color:inherit;padding:10px 6px;font-size:12px">💰 Ví</a></div></div>`;
    h+=`<div style="display:flex;gap:8px;margin-bottom:24px"><a href="#/booking" class="btn btn-primary" style="flex:1">Đặt lịch nhanh</a><a href="#/jobs" class="btn btn-accent" style="flex:1">Tìm việc</a></div>`;
    if(o.length){
      h+=`<h2 style="margin:0 0 12px">Việc của tôi</h2><div style="display:flex;flex-direction:column;gap:8px">`;
      o.slice(0,5).forEach(x=>h+=`<a href="#/orders/${x.id}" class="card" style="text-decoration:none;color:inherit"><div style="display:flex;justify-content:space-between"><div><div style="font-weight:700">Đơn #${x.id.slice(-6)}</div><div style="font-size:12px;color:var(--muted)">${x.type==='instant'?'Đặt lịch':'Việc'}·${fmt(x.amount)}</div></div><span style="background:${statusColor(x.status)};color:#fff;padding:4px 8px;border-radius:999px;font-size:11px">${x.status}</span></div></a>`);
      h+=`</div>`;
    }
    h+=`<h2 style="margin:24px 0 12px">Thợ hàng đầu</h2><div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px">`;
    wk.slice(0,8).forEach(x=>h+=`<div class="card" style="min-width:110px;padding:12px"><div style="font-weight:700;font-size:13px">${esc(x.name)}</div><div style="font-size:11px;color:var(--muted)">⭐${x.rating_avg}·${x.jobs_done}việc</div></div>`);
    h+=`</div>`;
  }
  return shell(h,'Trang chủ');
};

// SERVICES + BOOKING
routes['/services']=async()=>{const s=await api('/services');let h='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">';s.forEach(x=>h+=`<a href="#/booking?service=${x.id}" class="card" style="text-decoration:none;color:inherit"><div style="font-size:32px;text-align:center;margin-bottom:8px">${ICONS[x.slug]||'🛠️'}</div><div style="font-weight:700;text-align:center">${esc(x.name)}</div><div style="font-size:12px;color:var(--muted);text-align:center">Từ ${fmt(x.base_price)}/${x.unit}</div></a>`);h+='</div>';return shell(h,'Dịch vụ');};
routes['/booking']=async()=>{const p=new URLSearchParams(location.hash.split('?')[1]||'');const sel=p.get('service');const s=await api('/services');const opts=s.map(x=>`<option value="${x.id}" ${x.id===sel?'selected':''}>${esc(x.name)}</option>`).join('');return shell(`<form id="bookingForm"><label style="font-size:12px;color:var(--muted)">Dịch vụ</label><select class="input" name="service_id" required>${opts}</select><label style="font-size:12px;color:var(--muted)">Địa chỉ</label><input class="input" name="address" placeholder="Số nhà, đường..." required/><label style="font-size:12px;color:var(--muted)">Quận</label><select class="input" name="district" required>${Object.entries(DISTRICTS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><label style="font-size:12px;color:var(--muted)">Thời gian</label><input class="input" name="scheduled_at" type="datetime-local"/><label style="font-size:12px;color:var(--muted)">Ghi chú</label><textarea class="input" name="note" rows="3" placeholder="Mô tả vấn đề..."></textarea><label style="font-size:12px;color:var(--muted)">Ảnh minh họa</label><input class="input" name="photos" type="file" accept="image/*" capture="environment" multiple/><button class="btn btn-primary" type="submit">Đặt lịch</button></form>`,'Đặt lịch nhanh');};

// JOBS
let jobMapInstance=null;
function destroyJobMap(){if(jobMapInstance){try{jobMapInstance.remove();}catch{}jobMapInstance=null;}
  const old=document.getElementById('jobMap');if(old)old._leaflet_pos=null;}
function jobMarkerPos(j){
  const c=DISTRICT_CENTROIDS[j.district];
  const base=Array.isArray(c)?{lat:c[0],lng:c[1]}:{lat:10.7750,lng:106.7000};
  if(typeof j.lat==='number'&&typeof j.lng==='number'&&isFinite(j.lat)&&isFinite(j.lng))return{jitter:false,lat:j.lat,lng:j.lng};
  // Fallback: tâm quận + jitter tất định từ id để marker cùng quận không chồng nhau
  let h=0;for(const ch of String(j.id))h=(h*31+ch.charCodeAt(0))>>>0;
  const jitter=()=>((h>>>0)%1000)/1000*0.008-0.004;h=(h*1103515245+12345)>>>0;
  return{jitter:true,lat:base.lat+jitter(),lng:base.lng+jitter()};
}
routes['/jobs']=async()=>{
  const p=new URLSearchParams(location.hash.split('?')[1]||'');
  const district=p.get('district')||'';
  const sort=['budget','new'].includes(p.get('sort'))?p.get('sort'):'new';
  const view=p.get('view')==='map'?'map':'list';
  const goView=v=>{const q=new URLSearchParams();if(district)q.set('district',district);if(sort!=='new')q.set('sort',sort);if(v!=='list')q.set('view','map');location.hash='#/jobs'+(q.toString()?'?'+q:'');};
  let h=`<div class="filter-bar"><select id="jobDistrict" class="input" style="margin:0;flex:1" aria-label="Lọc theo quận">
    <option value="">Tất cả quận</option>
    ${Object.entries(DISTRICTS).map(([k,v])=>`<option value="${k}" ${district===k?'selected':''}>${v}</option>`).join('')}
  </select>
  <div class="seg" role="group" aria-label="Kiểu hiển thị">
    <button type="button" data-view="list" class="${view==='list'?'active':''}">Danh sách</button>
    <button type="button" data-view="map" class="${view==='map'?'active':''}">Bản đồ</button>
  </div></div>
  <div class="filter-bar">
    <div class="seg" role="group" aria-label="Sắp xếp">
      <button type="button" data-sort="new" class="${sort==='new'?'active':''}">Mới nhất</button>
      <button type="button" data-sort="budget" class="${sort==='budget'?'active':''}">Ngân sách</button>
    </div>
  </div>
  <div id="jobCount" class="meta-line" style="margin-bottom:10px"></div>`;
  if(view==='map'){
    h+=`<div id="jobMap" class="map-box" aria-label="Bản đồ công việc"><div class="empty-state" style="padding:24px">Đang tải bản đồ…</div></div>
    <p class="meta-line" style="margin-top:8px">💡 Việc chưa có tọa độ chính xác sẽ hiển thị gần tâm quận.</p>`;
  }else{
    h+=`<div id="jobList">${skeletonRows(5,84)}</div>`;
  }
  if(state.user?.role==='customer')h+=`<a href="#/jobs/new" class="fab" aria-label="Đăng việc mới">+ Đăng việc</a>`;
  setTimeout(async()=>{
    try{
      const j=await api('/jobs?status=open');
      const countEl=$('#jobCount');if(!countEl)return;
      let items=j;
      if(district)items=items.filter(x=>x.district===district);
      items=[...items].sort((a,b)=>sort==='budget'
        ?(Number(b.budget_max)||0)-(Number(a.budget_max)||0)
        :new Date(b.created_at||0)-new Date(a.created_at||0));
      countEl.textContent=`${items.length} công việc đang mở${district?` · ${DISTRICTS[district]||district}`:''}`;
      if(view==='map'){renderJobsMap(items);return}
      const l2=$('#jobList');if(!l2)return;
      if(!items.length){
        l2.innerHTML=`<div class="empty-state"><div class="icon">🔍</div><p>Chưa có công việc nào${district?' ở quận này':''}.</p><p style="font-size:13px;margin-top:4px">Thử xóa bộ lọc hoặc quay lại sau nhé.</p></div>`;
        return;
      }
      l2.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px">`+items.map(x=>{
        const icon=ICONS[x.category_slug]||'🛠️';
        return `<a href="#/jobs/${x.id}" class="card job-card" style="text-decoration:none;color:inherit;display:flex;gap:12px;align-items:flex-start">
          <span class="job-icon" aria-hidden="true">${icon}</span>
          <span style="flex:1;min-width:0">
            <span class="job-title">${esc(x.title)}</span>
            <span class="meta-line" style="display:block;margin-top:3px">📍 ${DISTRICTS[x.district]||esc(x.district)}${x.deadline?` · ⏰ ${fmtDay(x.deadline)}`:''}</span>
          </span>
          <span class="budget" style="flex:none;text-align:right">${fmt(Number(x.budget_min)||0)}<br>– ${fmt(Number(x.budget_max)||0)}</span>
        </a>`;
      }).join('')+`</div>`;
    }catch(err){
      const box=view==='map'?$('#jobMap'):$('#jobList');if(!box)return;
      box.innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><p>${esc(err.message)}</p><button class="btn btn-outline" onclick="renderRoute()" style="margin-top:12px;width:auto">Thử lại</button></div>`;
    }
  },0);
  setTimeout(()=>{
    $('#jobDistrict')?.addEventListener('change',e=>goView(view));
    document.querySelectorAll('#app [data-view]').forEach(b=>b.addEventListener('click',()=>goView(b.dataset.view)));
    document.querySelectorAll('.seg [data-sort]').forEach(b=>b.addEventListener('click',()=>goView(view)));
  },0);
  return shell(h,'Công việc');
};

function renderJobsMap(items){
  const el=$('#jobMap');if(!el)return;
  if(typeof window.L==='undefined'){
    el.innerHTML='<div class="empty-state"><div class="icon">🗺️</div><p>Không tải được thư viện bản đồ.</p><button class="btn btn-outline" onclick="location.reload()" style="margin-top:12px;width:auto">Tải lại trang</button></div>';
    return;
  }
  destroyJobMap();
  if(!items.length){el.innerHTML='<div class="empty-state"><div class="icon">🔍</div><p>Chưa có công việc nào để hiển thị.</p></div>';return}
  jobMapInstance=window.L.map(el,{scrollWheelZoom:true}).setView([10.7750,106.7000],11);
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(jobMapInstance);
  const bounds=[];
  items.forEach(x=>{
    const pos=jobMarkerPos(x);
    bounds.push([pos.lat,pos.lng]);
    const m=window.L.marker([pos.lat,pos.lng]).addTo(jobMapInstance);
    m.bindPopup(`<div style="min-width:180px">
      <div style="font-weight:700;margin-bottom:4px">${esc(x.title)}</div>
      <div style="font-size:12px;color:#62748A">${ICONS[x.category_slug]||'🛠️'} ${DISTRICTS[x.district]||esc(x.district)}${pos.jitter?' · gần đây':''}</div>
      <div style="font-size:13px;font-weight:800;color:#0B6CFF;margin:6px 0">${fmt(Number(x.budget_min)||0)} – ${fmt(Number(x.budget_max)||0)}</div>
      <button type="button" data-job-link="${esc(x.id)}" style="width:100%;border:0;background:#0B6CFF;color:#fff;padding:8px 12px;border-radius:8px;font-weight:700;cursor:pointer">Xem chi tiết</button>
    </div>`);
  });
  if(bounds.length===1)jobMapInstance.setView(bounds[0],14);
  else jobMapInstance.fitBounds(bounds,{padding:[40,40]});
  el.addEventListener('click',e=>{
    const btn=e.target.closest('[data-job-link]');
    if(btn)location.hash='#/jobs/'+btn.dataset.jobLink;
  });
}
routes['/jobs/new']=async()=>{const s=await api('/services');const opts=s.map(x=>`<option value="${x.slug}">${esc(x.name)}</option>`).join('');return shell(`<form id="jobForm"><input class="input" name="title" placeholder="Tiêu đề công việc" required/><textarea class="input" name="description" rows="4" placeholder="Mô tả chi tiết..." required></textarea><select class="input" name="category_slug" required><option value="">Loại dịch vụ</option>${opts}</select><input class="input" name="address" placeholder="Địa chỉ (số nhà, tên đường) — dùng để hiển thị trên bản đồ"/><select class="input" name="district" required><option value="">Quận</option>${Object.entries(DISTRICTS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><div style="display:flex;gap:8px"><input class="input" name="budget_min" type="number" placeholder="Từ (VND)" required/><input class="input" name="budget_max" type="number" placeholder="Đến (VND)" required/></div><input class="input" name="deadline" type="date"/><button class="btn btn-primary" type="submit">Đăng việc</button></form>`,'Đăng việc mới');};
routes['/jobs/:id']=async(id)=>{const j=await api(`/jobs/${id}`);const io=state.user?.id===j.customer_id;let h=`<div class="card"><h3 style="margin:0 0 8px">${esc(j.title)}</h3><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(j.customer_name||'')}·${DISTRICTS[j.district]||j.district}·${j.deadline||'Không hạn'}</div>${j.address?`<div style="font-size:13px;margin-bottom:8px">📍 ${esc(j.address)}, ${DISTRICTS[j.district]||esc(j.district)}${(typeof j.lat==='number'&&typeof j.lng==='number')?` <a href="https://www.openstreetmap.org/?mlat=${j.lat}&mlon=${j.lng}#map=17/${j.lat}/${j.lng}" target="_blank" rel="noopener" style="font-size:12px">(bản đồ ↗)</a>`:''}</div>`:''}<div style="font-size:14px;color:var(--primary);font-weight:700;margin-bottom:8px">${fmt(j.budget_min)}-${fmt(j.budget_max)}</div><p style="margin:0">${esc(j.description)}</p></div>`;if(io){h+=`<h3 style="margin:16px 0 8px">Báo giá (${j.bids?.length||0})</h3>`;(j.bids||[]).forEach(b=>h+=`<div class="card"><div style="font-weight:700">${esc(b.worker_name)}·${fmt(b.price)}</div><div style="font-size:13px;color:var(--muted)">${esc(b.message)}·${b.duration_days}ngày</div>${b.status==='pending'?`<button class="btn btn-primary accept-bid" data-id="${b.id}" style="margin-top:8px">Chấp nhận</button>`:''}<span style="display:inline-block;margin-top:8px;padding:4px 8px;border-radius:999px;font-size:11px;background:${statusColor(b.status)};color:#fff">${b.status}</span></div>`);}else{const mb=(j.bids||[]).find(b=>b.worker_id===state.user?.id);if(mb)h+=`<div class="card"><div style="font-weight:700">Báo giá của bạn: ${fmt(mb.price)}</div><span style="display:inline-block;margin-top:8px;padding:4px 8px;border-radius:999px;font-size:11px;background:${statusColor(mb.status)};color:#fff">${mb.status}</span></div>`;else if(state.user?.role==='worker'&&j.status==='open')h+=`<form id="bidForm" style="margin-top:16px"><input class="input" name="price" type="number" placeholder="Giá báo giá (VND)" required/><textarea class="input" name="message" rows="3" placeholder="Lời nhắn..."></textarea><input class="input" name="duration_days" type="number" value="1"/><button class="btn btn-primary" type="submit">Gửi báo giá</button></form>`;}return shell(h,`Việc #${j.id.slice(-6)}`);};

// ORDERS
routes['/orders']=async()=>{const o=await api('/orders?mine=1');let h='<div style="display:flex;flex-direction:column;gap:8px">';o.forEach(x=>h+=`<a href="#/orders/${x.id}" class="card" style="text-decoration:none;color:inherit"><div style="display:flex;justify-content:space-between"><div><div style="font-weight:700">Đơn #${x.id.slice(-6)}</div><div style="font-size:12px;color:var(--muted)">${x.type==='instant'?'Đặt lịch':'Việc'}·${fmt(x.amount)}</div></div><span style="background:${statusColor(x.status)};color:#fff;padding:4px 8px;border-radius:999px;font-size:11px">${x.status}</span></div></a>`);h+='</div>';return shell(h,'Đơn hàng');};
routes['/orders/:id']=async(id)=>{const o=await api(`/orders/${id}`);const ic=o.customer_id===state.user?.id;const iw=o.worker_id===state.user?.id;let h=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:700">Đơn #${o.id.slice(-6)}</div><span style="background:${statusColor(o.status)};color:#fff;padding:4px 8px;border-radius:999px;font-size:11px">${o.status}</span></div><div style="font-size:13px;color:var(--muted)">Loại: ${o.type==='instant'?'Đặt lịch tức thì':'Việc đấu giá'}</div><div style="font-size:18px;font-weight:800;color:var(--primary);margin:8px 0">${fmt(o.amount)}</div><div style="font-size:12px;color:var(--muted)">Escrow: ${o.escrow}</div></div>`;if(o.related){h+=`<div class="card"><div style="font-weight:700;margin-bottom:4px">Chi tiết liên quan</div>`;if(o.type==='instant'){h+=`<div style="font-size:13px">Địa chỉ: ${esc(o.related.address)}·${DISTRICTS[o.related.district]||o.related.district}</div><div style="font-size:13px">Thời gian: ${fmtDate(o.related.scheduled_at)}</div>`;}else{h+=`<div style="font-weight:700">${esc(o.related.title)}</div><div style="font-size:13px;color:var(--muted)">${esc(o.related.description)}</div>`;}h+='</div>';}if(o.status==='awaiting_payment'&&ic)h+=`<button class="btn btn-primary pay-btn" data-id="${o.id}">Thanh toán (giữ tiền)</button>`;if(iw){if(['awaiting_payment','in_progress'].includes(o.status))h+=`<button class="btn btn-primary start-btn" data-id="${o.id}">Bắt đầu</button>`;if(o.status==='in_progress')h+=`<button class="btn btn-accent deliver-btn" data-id="${o.id}">Đã hoàn thành</button>`;}if(o.status==='delivered'&&ic)h+=`<button class="btn btn-primary confirm-btn" data-id="${o.id}">Xác nhận hoàn thành</button>`;if(ic&&['created','awaiting_payment'].includes(o.status))h+=`<button class="btn btn-outline cancel-btn" data-id="${o.id}">Hủy đơn</button>`;if(o.status==='completed'&&ic)h+=`<form id="reviewForm" style="margin-top:16px"><div style="font-weight:700;margin-bottom:8px">Đánh giá thợ</div><select class="input" name="rating"><option value="5">⭐⭐⭐⭐⭐(5)</option><option value="4">⭐⭐⭐⭐(4)</option><option value="3">⭐⭐⭐(3)</option><option value="2">⭐⭐(2)</option><option value="1">⭐(1)</option></select><textarea class="input" name="comment" rows="3" placeholder="Nhận xét..."></textarea><button class="btn btn-primary" type="submit">Gửi đánh giá</button></form>`;h+=`<a href="#/chat?order=${o.id}" class="btn btn-outline" style="margin-top:12px">💬 Nhắn tin</a>`;return shell(h,`Đơn #${o.id.slice(-6)}`);};

// WORKERS
routes['/workers']=async()=>{
  const p=new URLSearchParams(location.hash.split('?')[1]||'');
  const skill=p.get('skill')||'';
  const district=p.get('district')||'';
  const sort=p.get('sort')==='jobs'?'jobs':'rating';
  const go=(over={})=>{const q=new URLSearchParams({skill,district,sort,...over});for(const[k,v]of[...q])if(!v)q.delete(k);location.hash='#/workers'+(q.toString()?'?'+q:'');};
  let h=`<div class="chip-row" role="group" aria-label="Lọc theo kỹ năng">
    <button type="button" class="chip ${!skill?'active':''}" data-skill="">Tất cả</button>
    ${Object.entries(SKILLS).map(([k,v])=>`<button type="button" class="chip ${skill===k?'active':''}" data-skill="${k}">${ICONS[k]||'🛠️'} ${v}</button>`).join('')}
  </div>
  <div class="filter-bar">
    <select id="wDistrict" class="input" style="margin:0;flex:1" aria-label="Lọc theo quận">
      <option value="">Tất cả quận</option>
      ${Object.entries(DISTRICTS).map(([k,v])=>`<option value="${k}" ${district===k?'selected':''}>${v}</option>`).join('')}
    </select>
    <div class="seg" role="group" aria-label="Sắp xếp">
      <button type="button" data-sort="rating" class="${sort==='rating'?'active':''}">⭐ Đánh giá</button>
      <button type="button" data-sort="jobs" class="${sort==='jobs'?'active':''}">Việc nhiều</button>
    </div>
  </div>
  <div id="wCount" class="meta-line" style="margin-bottom:10px"></div>
  <div id="workerList">${skeletonRows(5,92)}</div>`;
  setTimeout(async()=>{
    try{
      const qs=new URLSearchParams();if(skill)qs.set('skill',skill);if(district)qs.set('district',district);qs.set('sort',sort);
      const ws=await api(`/workers?${qs}`);
      const list=$('#workerList'),count=$('#wCount');if(!list)return;
      count.textContent=`${ws.length} thợ${district?` · ${DISTRICTS[district]||district}`:''}${skill?` · ${SKILLS[skill]||skill}`:''}`;
      if(!ws.length){
        list.innerHTML=`<div class="empty-state"><div class="icon">👷</div><p>Chưa có thợ phù hợp.</p><p style="font-size:13px;margin-top:4px">Thử chọn kỹ năng hoặc khu vực khác.</p></div>`;
        return;
      }
      list.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px">`+ws.map(w=>{
        const skills=safeList(w.skills);
        const shown=skills.slice(0,3).map(s=>SKILLS[s]||s);
        const more=skills.length>3?`+${skills.length-3}`:'';
        const rating=Number(w.rating_avg)||0;
        return `<a href="#/workers/${w.id}" class="card worker-card" style="text-decoration:none;color:inherit;display:flex;gap:12px;align-items:center">
          <span class="avatar-lg" aria-hidden="true">${esc(initials(w.name))}</span>
          <span style="flex:1;min-width:0">
            <span style="display:flex;align-items:center;gap:6px;min-width:0">
              <span class="job-title">${esc(w.name)}</span>
              ${w.cccd_verified?`<span title="Đã xác minh CCCD" aria-label="Đã xác minh CCCD">✅</span>`:''}
            </span>
            <span style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap">
              <span class="rating-pill">⭐ ${rating?rating.toFixed(1):'Mới'}${w.rating_count?` (${w.rating_count})`:''}</span>
              <span class="meta-line">${w.jobs_done||0} việc · ${w.years_exp||0} năm KN</span>
            </span>
            ${shown.length?`<span class="skill-chips">${shown.map(s=>`<span class="skill-chip">${esc(s)}</span>`).join('')}${more?`<span class="skill-chip">${more}</span>`:''}</span>`:''}
          </span>
        </a>`;
      }).join('')+`</div>`;
    }catch(err){
      const l=$('#workerList');if(!l)return;
      l.innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><p>${esc(err.message)}</p><button class="btn btn-outline" onclick="renderRoute()" style="margin-top:12px;width:auto">Thử lại</button></div>`;
    }
  },0);
  setTimeout(()=>{
    document.querySelectorAll('.chip[data-skill]').forEach(c=>c.addEventListener('click',()=>go({skill:c.dataset.skill})));
    document.querySelectorAll('.seg [data-sort]').forEach(b=>b.addEventListener('click',()=>go({sort:b.dataset.sort})));
    $('#wDistrict')?.addEventListener('change',e=>go({district:e.target.value}));
  },0);
  return shell(h,'Danh sách thợ');
};
routes['/workers/:id']=async(id)=>{const w=await api(`/workers/${id}`);let h=`<div class="card" style="text-align:center"><div class="avatar" style="margin:0 auto 8px;width:72px;height:72px;font-size:28px">${esc(w.name).charAt(0)}</div><div style="font-weight:800;font-size:18px">${esc(w.name)}${w.profile?.cccd_verified?' <span title="Đã xác minh CCCD">✅</span>':''}</div><div style="font-size:13px;color:var(--muted)">⭐${w.profile?.rating_avg||'Chưa có'}·${w.profile?.jobs_done||0}việc·${w.profile?.years_exp||0}năm KN</div></div>`;if(w.profile){const skills=safeList(w.profile.skills),districts=safeList(w.profile.districts),portfolio=safeList(w.profile.portfolio);
h+=`<div class="card"><div style="font-weight:700;margin-bottom:6px">Giới thiệu</div><div style="font-size:13px;color:var(--muted)">${esc(w.profile.bio||'Chưa có mô tả')}</div>${skills.length?`<div style="margin-top:10px"><span style="font-size:12px;color:var(--muted)">Kỹ năng:</span> ${skills.map(s=>SKILLS[s]||esc(s)).join(', ')}</div>`:''}${districts.length?`<div style="margin-top:6px;font-size:13px"><span style="color:var(--muted)">Khu vực:</span> ${districts.map(d=>DISTRICTS[d]||esc(d)).join(', ')}</div>`:''}</div>`;
if(portfolio.length){h+=`<h3 style="margin:16px 0 10px">Dự án đã làm (${portfolio.length})</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">`+portfolio.slice(0,12).map((u,i)=>`<img src="${esc(photoUrl(u))}" alt="Dự án ${i+1}" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;border:1px solid var(--border)"/>`).join('')+`</div>`;}}
if(w.reviews?.length){h+=`<h3 style="margin:16px 0 10px">Đánh giá</h3>`;w.reviews.forEach(r=>h+=`<div class="card"><div style="font-weight:700">${r.rating}⭐</div><div style="font-size:13px;color:var(--muted)">${esc(r.comment||'')}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">${fmtDate(r.created_at)}</div></div>`);}return shell(h,'Thợ');};

// CHAT
routes['/chat']=async()=>{const c=await api('/conversations');let h='<div style="display:flex;flex-direction:column;gap:8px">';if(!c.length)h+=`<p style="color:var(--muted);text-align:center;margin-top:24px">Chưa có tin nhắn nào</p>`;c.forEach(x=>h+=`<a href="#/chat/${x.id}" class="card" style="text-decoration:none;color:inherit"><div style="font-weight:700">Chat #${x.id.slice(-6)}</div><div style="font-size:12px;color:var(--muted)">${esc(x.last_message?.body?.slice(0,60)||'')}</div></a>`);h+='</div>';return shell(h,'Tin nhắn');};
routes['/chat/:id']=async(id)=>{const m=await api(`/conversations/${id}/messages?limit=50`);let h=`<div id="chatThread" style="display:flex;flex-direction:column;gap:8px;margin-bottom:60px;max-height:60vh;overflow-y:auto">`;m.forEach(x=>{const mn=x.sender_id===state.user?.id;h+=`<div style="align-self:${mn?'flex-end':'flex-start'};background:${mn?'var(--primary)':'#fff'};color:${mn?'#fff':'var(--text)'};padding:10px 14px;border-radius:16px;max-width:80%;border:1px solid ${mn?'transparent':'var(--border)'}">${esc(x.body)}</div>`;});h+=`</div><form id="chatForm" style="position:fixed;bottom:64px;left:50%;transform:translateX(-50%);width:100%;max-width:480px;padding:8px 16px;background:var(--surface);display:flex;gap:8px;border-top:1px solid var(--border)"><input class="input" name="body" placeholder="Nhắn tin..." style="flex:1;margin-bottom:0" required/><button class="btn btn-primary" type="submit" style="width:auto;padding:10px 16px">Gửi</button></form>`;setTimeout(()=>{const t=$('#chatThread');if(t)t.scrollTop=t.scrollHeight;const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/ws/chat/${id}?token=${state.token}`);ws.onmessage=e=>{const x=JSON.parse(e.data);const t=$('#chatThread');if(!t)return;const mn=x.senderId===state.user?.id;const d=document.createElement('div');d.style.alignSelf=mn?'flex-end':'flex-start';d.style.background=mn?'var(--primary)':'#fff';d.style.color=mn?'#fff':'var(--text)';d.style.padding='10px 14px';d.style.borderRadius='16px';d.style.maxWidth='80%';d.style.border='1px solid '+(mn?'transparent':'var(--border)');d.textContent=x.body;t.appendChild(d);t.scrollTop=t.scrollHeight;};},0);return shell(h,'Tin nhắn');};

// NOTIFICATIONS
routes['/notifications']=async()=>{const n=await api('/notifications');let h='<div style="display:flex;flex-direction:column;gap:8px">';if(!n.length)h+=`<p style="color:var(--muted);text-align:center;margin-top:24px">Không có thông báo</p>`;n.forEach(x=>h+=`<div class="card" style="opacity:${x.read_at?0.6:1}"><div style="font-weight:700">${esc(x.title)}</div><div style="font-size:13px;color:var(--muted)">${esc(x.body)}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">${fmtDate(x.created_at)}</div></div>`);h+='</div><button class="btn btn-outline read-all-btn" style="margin-top:16px">Đánh dấu tất cả đã đọc</button>';return shell(h,'Thông báo');};

// WALLET
routes['/wallet']=async()=>{
  const d=await api('/wallet');
  let payoutInfo=null;
  try{payoutInfo=await api('/worker/payouts');}catch{}
  const cfg=state.user?.role==='worker'?payoutInfo?.config:null;
  let h=`<div class="card" style="background:linear-gradient(135deg,var(--primary),#00C2FF);color:#fff"><div style="font-size:12px;opacity:0.9">Số dư khả dụng</div><div style="font-size:32px;font-weight:800;margin:4px 0">${fmt(d.available)}</div><div style="font-size:12px;opacity:0.9">Đang chờ rút định kỳ: ${fmt(d.pending)}</div></div>`;
  if(cfg){
    const days=cfg.payout_days.map(x=>x).join(' và ');
    h+=`<div class="card" style="margin-top:14px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="font-weight:700;font-size:14px">Rút tiền</div>
        <span class="meta-line">Ngưỡng tối thiểu: <b>${fmt(cfg.min_payout)}</b></span>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary instant-payout-btn" style="flex:1" data-fee="${cfg.instant_fee_percent}">⚡ Rút ngay (phí ${cfg.instant_fee_percent}%)</button>
        <button class="btn btn-outline scheduled-payout-btn" style="flex:1">🗓️ Rút kỳ này (miễn phí)</button>
      </div>
      <div class="meta-line" style="margin-top:8px">Rút miễn phí được xử lý vào ngày ${days} hàng tháng. Rút ngay nhận tiền tức thì sau khi trừ phí.</div>
    </div>`;
    if(payoutInfo.payouts?.length){
      h+=`<h3 style="margin:20px 0 10px">Lịch sử rút tiền</h3><div style="display:flex;flex-direction:column;gap:8px">`;
      payoutInfo.payouts.slice(0,10).forEach(p=>{
        const st=p.status==='paid'?'<span class="rating-pill" style="background:var(--success-soft);color:var(--success)">Đã chuyển</span>':'<span class="rating-pill">Đang chờ</span>';
        h+=`<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px"><div><div style="font-weight:700">${fmt(p.amount)}</div><div class="meta-line">${fmtDate(p.created_at)}${p.status==='instant'?'':''}</div></div>${st}</div>`;
      });
      h+='</div>';
    }
  }
  h+=`<div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn-primary topup-btn" style="flex:1">Nạp tiền (Mock MoMo)</button></div><h3 style="margin:24px 0 12px">Lịch sử giao dịch</h3><div style="display:flex;flex-direction:column;gap:8px">`;
  d.transactions.forEach(t=>{const lb={topup:'Nạp tiền',hold:'Giữ tiền',release:'Nhận tiền',commission:'Hoa hồng',refund:'Hoàn tiền',withdraw:'Rút tiền'}[t.kind]||t.kind;const cl={topup:'#10B981',hold:'#F59E0B',release:'#10B981',commission:'#EF4444',refund:'#10B981',withdraw:'#6B7280'}[t.kind]||'#6B7280';h+=`<div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:700">${esc(lb)}</div><div style="font-size:12px;color:var(--muted)">${esc(t.note)}·${fmtDate(t.created_at)}</div></div><div style="font-weight:800;color:${cl}">${t.amount>0?'+':''}${fmt(t.amount)}</div></div>`;});
  h+='</div>';
  return shell(h,'Ví của tôi');
};

// PROFILE
routes['/profile']=async()=>{const u=state.user;let h=`<div class="card" style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;margin:0 auto 8px">${u.name?.charAt(0)||'?'}</div><div style="font-weight:700;font-size:18px">${esc(u.name)}</div><div style="font-size:12px;color:var(--muted)">${u.role==='customer'?'Khách hàng':u.role==='worker'?'Thợ':'Admin'}·${u.phone}</div></div><div style="display:flex;flex-direction:column;gap:8px;margin-top:16px"><a href="#/wallet" class="card" style="text-decoration:none;color:inherit;display:flex;justify-content:space-between"><span style="font-weight:700">💰 Ví của tôi</span><span style="color:var(--muted)">→</span></a><a href="#/orders" class="card" style="text-decoration:none;color:inherit;display:flex;justify-content:space-between"><span style="font-weight:700">📋 Đơn hàng</span><span style="color:var(--muted)">→</span></a><a href="#/notifications" class="card" style="text-decoration:none;color:inherit;display:flex;justify-content:space-between"><span style="font-weight:700">🔔 Thông báo</span><span style="color:var(--muted)">→</span></a>${u.role==='customer'?`<a href="#/become-worker" class="card" style="text-decoration:none;color:inherit;display:flex;justify-content:space-between"><span style="font-weight:700">🔧 Trở thành thợ</span><span style="color:var(--muted)">→</span></a>`:''}${u.role==='worker'?`<a href="#/profile-edit" class="card" style="text-decoration:none;color:inherit;display:flex;justify-content:space-between"><span style="font-weight:700">✏️ Sửa hồ sơ thợ</span><span style="color:var(--muted)">→</span></a>`:''}${u.role==='admin'?`<a href="#/admin" class="card" style="text-decoration:none;color:inherit;display:flex;justify-content:space-between"><span style="font-weight:700">🛡️ Quản trị</span><span style="color:var(--muted)">→</span></a>`:''}<button class="btn btn-danger logout-btn">Đăng xuất</button></div>`;if(u.role==='worker'){try{const wp=await api('/worker/profile');if(wp){const wSkills=safeList(wp.skills),wDistricts=safeList(wp.districts),wPortfolio=safeList(wp.portfolio);h+=`<div class="card" style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:700">Hồ sơ thợ</div><a href="#/profile-edit" style="font-size:12px;font-weight:700">Sửa</a></div><div style="font-size:13px;color:var(--muted)">${esc(wp.bio||'Chưa có mô tả')}</div><div style="margin-top:8px"><span class="rating-pill">⭐ ${Number(wp.rating_avg)||0}${wp.rating_count?` (${wp.rating_count})`:''}</span> <span class="meta-line">${wp.jobs_done||0} việc đã làm${wPortfolio.length?` · ${wPortfolio.length} ảnh dự án`:''}</span></div>${wSkills.length?`<div style="margin-top:8px;font-size:12px">Kỹ năng: ${wSkills.map(s=>SKILLS[s]||esc(s)).join(', ')}</div>`:''}${wDistricts.length?`<div style="font-size:12px">Khu vực: ${wDistricts.map(d=>DISTRICTS[d]||esc(d)).join(', ')}</div>`:''}<div style="font-size:12px;margin-top:4px">${wp.cccd_verified?'✅ Đã xác minh CCCD':'⚠️ Chưa xác minh CCCD'}</div></div>`;}}catch{}}return shell(h,'Tôi');};
routes['/profile-edit']=async()=>{let wp={bio:'',skills:[],districts:[],years_exp:0,cccd_last4:'',portfolio:[]};try{wp=await api('/worker/profile');}catch{}
const skills=safeList(wp.skills),districts=safeList(wp.districts);editPortfolio=safeList(wp.portfolio);
return shell(`<form id="profileForm">
<div class="card" style="padding:12px;margin-bottom:14px"><div style="font-weight:700;font-size:13px;margin-bottom:6px">💡 Hồ sơ đầy đủ giúp khách tin tưởng hơn</div><div class="meta-line">Thêm ảnh dự án đã làm và xác minh CCCD để tăng tỷ lệ được chọn.</div></div>
<label>Giới thiệu bản thân</label><textarea class="input" name="bio" rows="3" maxlength="2000">${esc(wp.bio||'')}</textarea>
<label>Kỹ năng</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${Object.entries(SKILLS).map(([k,v])=>`<label style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:600;color:var(--text)"><input type="checkbox" name="skills" value="${k}" ${skills.includes(k)?'checked':''}/>${ICONS[k]||''} ${v}</label>`).join('')}</div>
<label>Khu vực nhận việc</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${Object.entries(DISTRICTS).map(([k,v])=>`<label style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:600;color:var(--text)"><input type="checkbox" name="districts" value="${k}" ${districts.includes(k)?'checked':''}/>${v}</label>`).join('')}</div>
<div style="display:flex;gap:8px"><div style="flex:1"><label>Số năm kinh nghiệm</label><input class="input" name="years_exp" type="number" min="0" max="60" value="${Number(wp.years_exp)||0}"/></div><div style="flex:1"><label>4 số cuối CCCD</label><input class="input" name="cccd_last4" inputmode="numeric" maxlength="4" placeholder="VD: 1234" value="${esc(wp.cccd_last4||'')}"/></div></div>
<label>Dự án đã làm (ảnh) — tối đa 12</label>
<div id="portfolioList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>
<input class="input" id="portfolioUpload" type="file" accept="image/*" capture="environment" multiple style="padding:10px"/>
<button class="btn btn-primary" type="submit">Lưu hồ sơ</button></form>`,'Sửa hồ sơ');
setTimeout(()=>renderPortfolioEditor(),0);};

let editPortfolio=[];
function renderPortfolioEditor(){
  const box=$('#portfolioList');if(!box)return;
  if(!editPortfolio.length){box.innerHTML='<span class="meta-line">Chưa có ảnh dự án nào.</span>';return}
  box.innerHTML=editPortfolio.map((u,i)=>`<span style="position:relative;display:inline-block"><img src="${esc(photoUrl(u))}" alt="Dự án ${i+1}" style="width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid var(--border)"/><button type="button" data-rm-portfolio="${i}" aria-label="Xóa ảnh" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;background:var(--danger);color:#fff;font-size:12px;font-weight:800;cursor:pointer;line-height:1">×</button></span>`).join('');
}
function photoUrl(u){return u.startsWith('http')?u:`/api/photos/${u.replace(/^\/+/, '')}`;}
routes['/become-worker']=async()=>{return shell(`<form id="becomeForm"><p style="color:var(--muted);margin-bottom:16px">Điền thông tin để trở thành thợ và nhận việc trên FixNhanh.</p><textarea class="input" name="bio" rows="3" placeholder="Giới thiệu bản thân..." required></textarea><label style="font-size:12px;color:var(--muted)">Kỹ năng</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${Object.entries(SKILLS).map(([k,v])=>`<label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" name="skills" value="${k}"/>${v}</label>`).join('')}</div><label style="font-size:12px;color:var(--muted)">Khu vực làm việc</label><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${Object.entries(DISTRICTS).map(([k,v])=>`<label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" name="districts" value="${k}"/>${v}</label>`).join('')}</div><input class="input" name="years_exp" type="number" placeholder="Năm kinh nghiệm"/><input class="input" name="cccd_last4" placeholder="4 số cuối CCCD" maxlength="4"/><button class="btn btn-primary" type="submit">Đăng ký thợ</button></form>`,'Trở thành thợ');};

// ADMIN
routes['/admin']=async()=>{const s=await api('/admin/stats');let h=`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px"><div class="card"><div style="font-size:12px;color:var(--muted)">Người dùng</div><div style="font-size:24px;font-weight:800">${s.users}</div></div><div class="card"><div style="font-size:12px;color:var(--muted)">Thợ</div><div style="font-size:24px;font-weight:800">${s.workers}</div></div><div class="card"><div style="font-size:12px;color:var(--muted)">Đơn hàng</div><div style="font-size:24px;font-weight:800">${s.orders}</div></div><div class="card"><div style="font-size:12px;color:var(--muted)">Doanh thu</div><div style="font-size:20px;font-weight:800">${fmt(s.revenue)}</div></div></div><h3 style="margin:24px 0 12px">Người dùng</h3><div id="userList" style="display:flex;flex-direction:column;gap:8px"></div>`;setTimeout(async()=>{const l=$('#userList');if(!l)return;const u=await api('/admin/users');u.forEach(x=>{const d=document.createElement('div');d.className='card';d.style.display='flex';d.style.justifyContent='space-between';d.style.alignItems='center';d.innerHTML=`<div><div style="font-weight:700">${esc(x.name)}</div><div style="font-size:12px;color:var(--muted)">${x.phone}·${x.role}·${x.status}</div></div><button class="btn ${x.status==='active'?'btn-outline':'btn-primary'}" style="width:auto;padding:6px 12px;font-size:12px" data-userid="${x.id}" data-action="${x.status==='active'?'block':'unblock'}">${x.status==='active'?'Khóa':'Mở khóa'}</button>`;l.appendChild(d);});},0);return shell(h,'Quản trị');};

// SUPPORT — Hỗ trợ & khẩn cấp
routes['/support']=async()=>{
  let tickets=null;
  try{tickets=await api('/support');}catch{}
  const urgentOpen=(tickets||[]).filter(t=>t.category==='urgent'&&t.status==='open').length;
  let h=`<div class="card support-banner" id="supportBanner">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:20px">🚨</span><b style="color:var(--danger)">Hỗ trợ khẩn cấp</b>
    ${urgentOpen?`<span class="rating-pill" style="background:var(--danger);color:#fff">${urgentOpen} đang khẩn</span>`:''}</div>
    <p class="meta-line" style="margin-bottom:10px">Sự cố nguy hiểm (cháy, rò điện/nước nghiêm trọng, tranh chấp tại chỗ...)? Admin sẽ nhận thông báo ngay lập tức.</p>
  </div>
  <form id="supportForm" class="support-form" novalidate>
    <input type="hidden" name="category" id="supportCategory" value="general"/>
    <div class="seg" role="group" aria-label="Mức độ hỗ trợ" style="margin-bottom:14px">
      <button type="button" data-cat="general" class="active">💬 Thông thường</button>
      <button type="button" data-cat="urgent" style="color:var(--danger);font-weight:800">🚨 Khẩn cấp</button>
    </div>
    <label for="spSubject">Tiêu đề</label>
    <input class="input" id="spSubject" name="subject" placeholder="VD: Thợ chưa đến, sự cố điện..." maxlength="200" required/>
    <div class="char-counter" data-for="spSubject">0/200</div>
    <label for="spMessage">Mô tả chi tiết</label>
    <textarea class="input" id="spMessage" name="message" rows="4" placeholder="Mô tả vấn đề, địa chỉ và mức độ khẩn cấp nếu có..." maxlength="3000" required></textarea>
    <div class="char-counter" data-for="spMessage">0/3000</div>
    <label for="spPhone">Số điện thoại liên hệ</label>
    <input class="input" id="spPhone" name="contact_phone" inputmode="tel" placeholder="(Tùy chọn — mặc định dùng SĐT tài khoản)" value="${esc(state.user?.phone||'')}"/>
    <button class="btn btn-primary support-submit-btn" type="submit">Gửi yêu cầu hỗ trợ</button>
  </form>`;
  h+=`<h3 style="margin:22px 0 10px">Yêu cầu của bạn</h3><div id="ticketHistory">${tickets?renderTicketList(tickets):skeletonRows(3,72)}</div>`;
  return shell(h,'Hỗ trợ');
};

function renderTicketList(tickets){
  if(!Array.isArray(tickets))return '';
  if(!tickets.length)return `<div class="empty-state"><div class="icon">📭</div><p>Chưa có yêu cầu hỗ trợ nào.</p></div>`;
  const stBadge=s=>s==='open'?'<span class="rating-pill">Đang xử lý</span>':'<span class="rating-pill" style="background:var(--success-soft);color:var(--success)">Đã xong ✓</span>';
  return '<div style="display:flex;flex-direction:column;gap:8px">'+tickets.map((t,i)=>{
    const urgent=t.category==='urgent';
    return `<details class="card ticket-card" style="padding:12px;margin:0;${urgent?'border-left:3px solid var(--danger)':''}" data-open="${i===0&&urgent?1:0}">
      <summary style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;list-style:none">
        <span style="font-weight:700;font-size:13px;min-width:0">${urgent?'🔴 ':''}${esc(t.subject)}</span>
        <span style="display:flex;align-items:center;gap:8px;flex:none">${stBadge(t.status)}<span class="meta-line ticket-chevron">▾</span></span>
      </summary>
      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
        <p style="font-size:13px;line-height:1.55;margin:0 0 8px">${esc(t.message)}</p>
        <div class="meta-line">Gửi lúc ${fmtDate(t.created_at)}${t.status==='resolved'?' · Đã xử lý lúc '+fmtDate(t.resolved_at):''}</div>
      </div>
    </details>`;
  }).join('')+'</div>';
}

// 404
routes['*']=async()=>shell(`<div style="text-align:center;padding:48px 16px"><div style="font-size:48px">🤷</div><p style="color:var(--muted);margin-top:16px">Không tìm thấy trang</p><a href="#/home" class="btn btn-primary" style="margin-top:16px;display:inline-block;width:auto">Về trang chủ</a></div>`,'Lỗi');

async function renderRoute(){
  const hash=location.hash||'#/home';
  const path=hash.split('?')[0];
  let fn=routes[path],arg=null;
  if(!fn){
    let m;
    if((m=hash.match(/^#\/jobs\/([^\/]+)$/))){fn=routes['/jobs/:id'];arg=m[1];}
    else if((m=hash.match(/^#\/orders\/([^\/]+)$/))){fn=routes['/orders/:id'];arg=m[1];}
    else if((m=hash.match(/^#\/chat\/([^\/]+)$/))){fn=routes['/chat/:id'];arg=m[1];}
    else if((m=hash.match(/^#\/workers\/[^\/]+$/))){fn=routes['/workers/:id'];arg=m[0].split('/').pop();}
    else if((m=hash.match(/^#\/workers\/?$/))){fn=routes['/workers'];}
    else fn=routes['*'];
  }
  try{
    if(typeof destroyJobMap==='function')destroyJobMap();
    const html=await fn(arg);
    $('#app').innerHTML=html;
    bindEvents();
  }catch(e){
    console.error(e);$('#app').innerHTML=shell(`<p style="color:var(--danger);text-align:center">${esc(e.message)}</p>`,'Lỗi');
  }
}

function bindEvents(){
  // Form submissions
  $('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{const d=await api('/login',{method:'POST',body:JSON.stringify({phone:f.get('phone'),password:f.get('password')})});saveAuth(d);toast('Đăng nhập thành công');location.hash='#/home';}catch(err){toast(err.message);}});
  $('#regForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const role=f.get('role');const body={phone:f.get('phone'),name:f.get('name'),password:f.get('password'),role};if(role==='worker'){const skills=[...e.target.querySelectorAll('input[name="reg_skills"]:checked')].map(i=>i.value);const districts=[...e.target.querySelectorAll('input[name="reg_districts"]:checked')].map(i=>i.value);body.skills=skills;body.districts=districts;body.years_exp=Number(f.get('reg_years_exp')||0);body.bio=f.get('reg_bio')||'';}try{const d=await api('/register',{method:'POST',body:JSON.stringify(body)});saveAuth(d);toast('Đăng ký thành công');location.hash='#/home';}catch(err){toast(err.message);}});
  $('#bookingForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const photos=[];const files=f.getAll('photos');for(const file of files){if(file.size>0){const fd=new FormData();fd.append('file',file);const u=await api('/uploads',{method:'POST',body:fd});photos.push(u.key);}}try{await api('/bookings',{method:'POST',body:JSON.stringify({service_id:f.get('service_id'),address:f.get('address'),district:f.get('district'),scheduled_at:f.get('scheduled_at')||null,note:f.get('note'),photos})});toast('Đặt lịch thành công');location.hash='#/orders';}catch(err){toast(err.message);}});
  $('#jobForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/jobs',{method:'POST',body:JSON.stringify({title:f.get('title'),description:f.get('description'),category_slug:f.get('category_slug'),district:f.get('district'),address:f.get('address')||'',budget_min:Number(f.get('budget_min')),budget_max:Number(f.get('budget_max')),deadline:f.get('deadline')||null})});toast('Đăng việc thành công');location.hash='#/jobs';}catch(err){toast(err.message);}});
  $('#bidForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const jobId=location.hash.split('/')[2];try{await api(`/jobs/${jobId}/bids`,{method:'POST',body:JSON.stringify({price:Number(f.get('price')),message:f.get('message'),duration_days:Number(f.get('duration_days')||1)})});toast('Gửi báo giá thành công');renderRoute();}catch(err){toast(err.message);}});
  $('#reviewForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const orderId=location.hash.split('/')[2];try{await api(`/orders/${orderId}/review`,{method:'POST',body:JSON.stringify({rating:Number(f.get('rating')),comment:f.get('comment')})});toast('Cảm ơn đánh giá!');renderRoute();}catch(err){toast(err.message);}});
  $('#profileForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const skills=[...e.target.querySelectorAll('input[name="skills"]:checked')].map(i=>i.value);const districts=[...e.target.querySelectorAll('input[name="districts"]:checked')].map(i=>i.value);
    const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;
    try{await api('/worker/profile',{method:'POST',body:JSON.stringify({bio:f.get('bio'),skills,districts,years_exp:Number(f.get('years_exp')||0),cccd_last4:f.get('cccd_last4'),portfolio:editPortfolio})});toast('Lưu hồ sơ thành công');location.hash='#/profile';}catch(err){toast(err.message);}finally{btn.disabled=false;}});
  $('#portfolioUpload')?.addEventListener('change',async e=>{
    const files=[...e.target.files||[]];if(!files.length)return;
    const room=12-editPortfolio.length;if(room<=0){toast('Tối đa 12 ảnh dự án');e.target.value='';return}
    for(const file of files.slice(0,room)){
      if(!file.type.startsWith('image/')){toast(`${file.name} không phải ảnh`);continue}
      if(file.size>10*1024*1024){toast(`${file.name} vượt quá 10MB`);continue}
      try{const fd=new FormData();fd.append('file',file);const u=await api('/uploads',{method:'POST',body:fd});editPortfolio.push(u.key);}
      catch(err){toast(`Tải ${file.name} thất bại`);}
    }
    e.target.value='';renderPortfolioEditor();
  });
  document.querySelectorAll('[data-rm-portfolio]').forEach(b=>b.addEventListener('click',()=>{editPortfolio.splice(Number(b.dataset.rmPortfolio),1);renderPortfolioEditor();}));
  $('#becomeForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const skills=[...e.target.querySelectorAll('input[name="skills"]:checked')].map(i=>i.value);const districts=[...e.target.querySelectorAll('input[name="districts"]:checked')].map(i=>i.value);try{await api('/become-worker',{method:'POST',body:JSON.stringify({bio:f.get('bio'),skills,districts,years_exp:Number(f.get('years_exp')||0),cccd_last4:f.get('cccd_last4')})});const me=await api('/me');state.user=me;localStorage.setItem('user',JSON.stringify(me));toast('Đăng ký thợ thành công!');location.hash='#/profile';}catch(err){toast(err.message);}});
  $('#chatForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const convoId=location.hash.split('/')[2];try{await api(`/conversations/${convoId}/messages`,{method:'POST',body:JSON.stringify({body:f.get('body')})});e.target.reset();}catch(err){toast(err.message);}});
  // Support: char counters
  document.querySelectorAll('.char-counter[data-for]').forEach(c=>{
    const input=document.getElementById(c.dataset.for);if(!input)return;
    const update=()=>{c.textContent=`${input.value.length}/${input.maxLength}`;c.style.color=input.value.length>=input.maxLength*0.95?'var(--danger)':'var(--muted)';};
    input.addEventListener('input',update);update();
  });
  // Support: toggle category — urgent làm nổi banner + form
  document.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{
    $('#supportCategory').value=b.dataset.cat;
    document.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('active',x===b));
    const urgent=b.dataset.cat==='urgent';
    const btn=$('.support-submit-btn');
    if(btn)btn.textContent=urgent?'🚨 Gửi yêu cầu KHẨN CẤP':'Gửi yêu cầu hỗ trợ';
    $('#supportBanner')?.classList.toggle('urgent-on',urgent);
    $('.support-form')?.classList.toggle('urgent-form',urgent);
  }));
  // Support: submit (urgent có bước xác nhận)
  $('#supportForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    if(!String(f.get('subject')).trim()||!String(f.get('message')).trim()){toast('Vui lòng nhập tiêu đề và mô tả');return;}
    const urgent=f.get('category')==='urgent';
    if(urgent&&!confirm('Gửi yêu cầu HỖ TRỢ KHẨN CẤP?\nAdmin sẽ nhận thông báo ngay lập tức.'))return;
    const btn=e.target.querySelector('.support-submit-btn');btn.disabled=true;btn.textContent='Đang gửi…';
    try{
      await api('/support',{method:'POST',body:JSON.stringify({category:f.get('category'),subject:f.get('subject'),message:f.get('message'),contact_phone:f.get('contact_phone')||''})});
      toast(urgent?'🚨 Đã gửi! Admin sẽ liên hệ ngay.':'Đã gửi yêu cầu hỗ trợ.');
      renderRoute();
    }catch(err){toast(err.message);btn.disabled=false;btn.textContent=urgent?'🚨 Gửi yêu cầu KHẨN CẤP':'Gửi yêu cầu hỗ trợ';}
  });
  // Event delegation for dynamic buttons
  $('#app').onclick=async e=>{
    const t=e.target.closest('[data-phone]');if(t){$('#loginForm input[name="phone"]').value=t.dataset.phone;$('#loginForm input[name="password"]').value='fixnhanh123';return;}
    const ab=e.target.closest('.accept-bid');if(ab){try{await api(`/bids/${ab.dataset.id}/accept`,{method:'POST'});toast('Chấp nhận báo giá thành công');renderRoute();}catch(err){toast(err.message);}}
    const pb=e.target.closest('.pay-btn');if(pb){try{await api(`/orders/${pb.dataset.id}/pay`,{method:'POST'});toast('Thanh toán thành công');renderRoute();}catch(err){toast(err.message);}}
    const sb=e.target.closest('.start-btn');if(sb){try{await api(`/orders/${sb.dataset.id}/start`,{method:'POST'});toast('Bắt đầu làm việc');renderRoute();}catch(err){toast(err.message);}}
    const db=e.target.closest('.deliver-btn');if(db){try{await api(`/orders/${db.dataset.id}/deliver`,{method:'POST'});toast('Đã đánh dấu hoàn thành');renderRoute();}catch(err){toast(err.message);}}
    const cb=e.target.closest('.confirm-btn');if(cb){try{await api(`/orders/${cb.dataset.id}/confirm`,{method:'POST'});toast('Xác nhận thành công');renderRoute();}catch(err){toast(err.message);}}
    const can=e.target.closest('.cancel-btn');if(can){if(!confirm('Bạn chắc chắn muốn hủy?'))return;try{await api(`/orders/${can.dataset.id}/cancel`,{method:'POST'});toast('Đã hủy đơn');renderRoute();}catch(err){toast(err.message);}}
    const tp=e.target.closest('.topup-btn');if(tp){const amt=prompt('Nhập số tiền nạp (VND):','500000');if(amt){try{await api('/wallet/topup',{method:'POST',body:JSON.stringify({amount:Number(amt),method:'momo_sandbox'})});toast('Nạp tiền thành công');renderRoute();}catch(err){toast(err.message);}}}
    const ipb=e.target.closest('.instant-payout-btn');
    if(ipb){const amt=prompt('Nhập số tiền rút NGAY (VND) — phí '+ipb.dataset.fee+'%:','1000000');if(amt){ipb.disabled=true;try{const res=await api('/worker/payout-request',{method:'POST',body:JSON.stringify({amount:Number(amt),mode:'instant'})});toast(`Đã nhận ${fmt(res.received)} (phí ${fmt(res.fee)})`);renderRoute();}catch(err){toast(err.message);ipb.disabled=false;}}}
    const spb=e.target.closest('.scheduled-payout-btn');
    if(spb){const amt=prompt('Nhập số tiền rút kỳ này (VND) — miễn phí, nhận vào ngày thanh toán cố định:','2000000');if(amt){spb.disabled=true;try{await api('/worker/payout-request',{method:'POST',body:JSON.stringify({amount:Number(amt),mode:'scheduled'})});toast('Đã đăng ký rút kỳ này');renderRoute();}catch(err){toast(err.message);spb.disabled=false;}}}
    const ra=e.target.closest('.read-all-btn');if(ra){try{await api('/notifications/read-all',{method:'POST'});toast('Đã đánh dấu đã đọc');renderRoute();}catch(err){toast(err.message);}}
    const lo=e.target.closest('.logout-btn');if(lo){logout();}
    const ub=e.target.closest('[data-userid]');if(ub){try{const act=ub.dataset.action||'block';await api(`/admin/users/${ub.dataset.userid}/${act}`,{method:'POST'});toast(act==='block'?'Đã khóa':'Đã mở khóa');renderRoute();}catch(err){toast(err.message);}}
    const acb=e.target.closest('.accept-booking-btn');if(acb){try{await api(`/bookings/${acb.dataset.id}/respond`,{method:'POST',body:JSON.stringify({action:'accept'})});toast('Đã nhận lịch đặt');renderRoute();}catch(err){toast(err.message);}}
    const dcb=e.target.closest('.decline-booking-btn');if(dcb){try{await api(`/bookings/${dcb.dataset.id}/respond`,{method:'POST',body:JSON.stringify({action:'decline'})});toast('Đã từ chối lịch đặt');renderRoute();}catch(err){toast(err.message);}}
    const clb=e.target.closest('.claim-booking-btn');if(clb){try{await api(`/bookings/${clb.dataset.id}/respond`,{method:'POST',body:JSON.stringify({action:'accept'})});toast('Đã nhận lịch đặt');renderRoute();}catch(err){toast(err.message);}}
  };
}

async function init(){
  if(state.token){try{const me=await api('/me');state.user=me;localStorage.setItem('user',JSON.stringify(me));}catch{logout();}}
  window.addEventListener('hashchange',renderRoute);
  renderRoute();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
}

document.addEventListener('DOMContentLoaded',init);
