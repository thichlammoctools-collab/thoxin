import { Hono } from 'hono';
import type { Env } from './types';

export const admin = new Hono<{ Bindings: Env }>();

admin.get('/', (c) => c.html(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin — FixNhanh</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#102a43;background:#f5f8fc;--blue:#0b6cff;--line:#dce5f0;--muted:#62748a;--green:#087443;--red:#a33a32}*{box-sizing:border-box}
body{margin:0;-webkit-font-smoothing:antialiased}
.shell{max-width:1180px;margin:auto;padding:24px}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:28px;flex-wrap:wrap}
.brand{font-size:24px;font-weight:850;letter-spacing:-.02em;display:flex;align-items:center;gap:10px}
.brand-mark{width:34px;height:34px;border-radius:10px;background:var(--blue);display:grid;place-items:center;color:#fff;font-weight:900;font-size:17px}
.muted{color:var(--muted)}
.identity{display:flex;align-items:center;gap:8px;margin-top:2px;font-size:14px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px #08744322;flex:none}
button,select{font:inherit;border:1px solid var(--line);background:#fff;border-radius:9px;padding:10px 16px;cursor:pointer;min-height:40px;transition:background .15s,border-color .15s,opacity .15s;color:inherit}
button:hover:not(:disabled){background:#f0f5fc}
button:disabled{opacity:.55;cursor:not-allowed}
button:focus-visible,select:focus-visible{outline:3px solid rgba(11,108,255,.3);outline-offset:2px}
button.danger{color:var(--red);border-color:#f3c9c4}
button.danger:hover:not(:disabled){background:#fff0ee}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.card,.panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 8px 24px #102a4310}
.card{position:relative;overflow:hidden}
.card .icon{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;font-size:18px;margin-bottom:12px}
.i-blue{background:#e8f1ff}.i-teal{background:#e0f5f1}.i-violet{background:#efeafd}.i-green{background:#e2f7eb}
.card small{color:var(--muted);font-weight:750;font-size:13px;display:block}
.value{font-size:26px;font-weight:850;margin-top:6px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.panel{margin-top:24px}
.toolbar{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:8px;flex-wrap:wrap}
.toolbar h2{margin:0;font-size:19px;letter-spacing:-.01em}
.table{width:100%;border-collapse:collapse}
.table th{text-align:left;padding:12px 10px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--line)}
.table td{text-align:left;padding:12px 10px;border-top:1px solid var(--line);font-size:14px;vertical-align:middle}
.table tbody tr{transition:background .12s}
.table tbody tr:hover{background:#f7fafd}
.user-cell{display:flex;align-items:center;gap:10px;min-width:0}
.avatar{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff}
.a-customer{background:#0b6cff}.a-worker{background:#0e9f6e}.a-admin{background:#7851d8}
.user-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.badge{display:inline-block;border-radius:99px;padding:4px 10px;font-size:12px;font-weight:750;background:#eef4fb;white-space:nowrap}
.active{color:var(--green);background:#e2f7eb}
.blocked{color:var(--red);background:#fff0ee}
.status{margin:10px 0;min-height:24px}
.toast{display:inline-block;padding:9px 14px;border-radius:10px;font-size:14px;font-weight:600;animation:pop .18s ease-out}
.toast.ok{color:var(--green);background:#e2f7eb}
.toast.err{color:var(--red);background:#fff0ee}
@keyframes pop{from{transform:translateY(4px);opacity:0}to{transform:none;opacity:1}}
.pager{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap}
.pager-btns{display:flex;gap:8px;margin-left:auto}
.skeleton{position:relative;overflow:hidden;background:#e9eff7!important;border:0}
.skeleton::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,#ffffffb0,transparent);animation:shine 1.2s infinite}
@keyframes shine{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.sk-card{height:96px}.sk-row{height:52px;margin-bottom:10px;border-radius:10px}
.empty{text-align:center;padding:44px 20px;color:var(--muted)}
.empty .face{font-size:36px;display:block;margin-bottom:8px}
.empty button{margin-top:12px}
@media(max-width:900px){.cards{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){
.shell{padding:16px}
.top{margin-bottom:20px}
.value{font-size:22px}
.card{padding:16px}
.table,.table tbody,.table tr,.table td{display:block}
.table thead{display:none}
.table tbody tr{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:#fff}
.table tbody tr:hover{background:#fff}
.table td{border:0;padding:6px 0;display:flex;justify-content:space-between;align-items:center;gap:12px}
.table td:before{content:attr(data-label);font-weight:750;color:var(--muted);flex:none}
.table td.actions-cell{padding-top:10px}
.table td.actions-cell:before{visibility:hidden;height:0}
button{min-height:44px}
}
</style></head><body><main class="shell">
<header class="top">
  <div>
    <div class="brand"><span class="brand-mark">F</span>FixNhanh</div>
    <div id="identity" class="identity muted"><span class="dot" hidden></span><span id="who">Đang kiểm tra phiên…</span></div>
  </div>
  <button id="logout" type="button">Đăng xuất</button>
</header>

<section id="stats" class="cards" aria-busy="true"></section>

<section class="panel">
  <div class="toolbar">
    <div><h2>Người dùng</h2><div id="count" class="muted"></div></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700">Vai trò
      <select id="role"><option value="">Tất cả</option><option value="customer">Khách hàng</option><option value="worker">Thợ sửa chữa</option><option value="admin">Quản trị viên</option></select>
    </label>
  </div>
  <div id="notice" class="status" role="status" aria-live="polite"></div>
  <div id="users"></div>
  <div class="pager">
    <span id="range" class="muted" style="font-size:13px"></span>
    <span class="pager-btns"><button id="prev" type="button">← Trước</button><button id="next" type="button">Sau →</button></span>
  </div>
</section>
</main><script>
(()=>{const token=localStorage.getItem('token'),me=JSON.parse(localStorage.getItem('user')||'null');let offset=0,limit=20,request=0,noticeTimer=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('vi-VN').format(Number(n)||0)+'đ';
const initials=n=>(String(n||'?').trim().split(/\\s+/).map(w=>w[0]).slice(0,2).join('')||'?').toUpperCase();
function logout(){localStorage.removeItem('token');localStorage.removeItem('user');location.href='/app#/login'}
if(!token||!me||me.role!=='admin'){logout();return}
$('who').textContent=(me.name||'Admin')+' · Quản trị viên';
document.querySelector('.dot').hidden=false;
async function api(path,opts={}){const r=await fetch('/api'+path,{...opts,headers:{Authorization:'Bearer '+token,...(opts.headers||{})}});
if(r.status===401||r.status===403){logout();throw Error('Phiên đăng nhập không hợp lệ')}
const data=await r.json();if(!r.ok)throw Error(data.error||'Có lỗi xảy ra');return data}
function notice(t,error=false){clearTimeout(noticeTimer);$('notice').innerHTML=t?'<span class="toast '+(error?'err':'ok')+'">'+esc(t)+'</span>':'';
if(t&&!error)noticeTimer=setTimeout(()=>{$('notice').innerHTML=''},4000)}
async function loadStats(){ $('stats').setAttribute('aria-busy','true');
$('stats').innerHTML='<div class="card sk-card skeleton"></div>'.repeat(4);
try{const s=await api('/admin/stats');
$('stats').innerHTML=[['Tổng người dùng',esc(s.users),'i-blue','👥'],['Thợ sửa chữa',esc(s.workers),'i-teal','🔧'],['Tổng đơn hàng',esc(s.orders),'i-violet','📦'],['Doanh thu hoa hồng',esc(money(s.revenue)),'i-green','💰']].map(x=>'<div class="card"><span class="icon '+x[2]+'">'+x[3]+'</span><small>'+x[0]+'</small><div class="value">'+x[1]+'</div></div>').join('');
$('stats').removeAttribute('aria-busy')}catch(e){
$('stats').innerHTML='<div class="card empty" style="grid-column:1/-1"><span class="face">⚠️</span>Không tải được thống kê.<br><button id="retryStats" type="button">Thử lại</button></div>';
if($('retryStats'))$('retryStats').onclick=loadStats}}
function skeletons(){$('users').innerHTML='<div class="sk-row skeleton"></div>'.repeat(Math.min(limit,6))}
async function loadUsers(){const id=++request;skeletons();
try{const role=$('role').value;const q=new URLSearchParams({limit:String(limit),offset:String(offset)});if(role)q.set('role',role);
const data=await api('/admin/users?'+q.toString());if(id!==request)return;
$('count').textContent=data.total+' kết quả';
const from=data.total===0?0:offset+1,to=Math.min(offset+limit,data.total);
$('range').textContent='Hiển thị '+from+'–'+to+' trên '+data.total;
$('prev').disabled=offset===0;$('next').disabled=to>=data.total;
if(!data.items.length){$('users').innerHTML='<div class="empty"><span class="face">🔍</span>Không có người dùng phù hợp.</div>';return}
const labels={customer:'Khách hàng',worker:'Thợ sửa chữa',admin:'Quản trị viên'};
let rows='';
for(const u of data.items){
rows+='<tr><td><span class="user-cell"><span class="avatar a-'+esc(u.role)+'">'+esc(initials(u.name))+'</span><span class="user-name">'+esc(u.name||'Chưa cập nhật')+'</span></span></td>'
+'<td data-label="Liên hệ">'+esc(u.phone)+'</td>'
+'<td data-label="Vai trò"><span class="badge">'+esc(labels[u.role]||u.role)+'</span></td>'
+'<td data-label="Trạng thái"><span class="badge '+esc(u.status)+'">'+(u.status==='active'?'Đang hoạt động':'Đã khóa')+'</span></td>'
+'<td data-label="Ngày tạo">'+esc(u.created_at?new Date(u.created_at).toLocaleDateString('vi-VN'):'—')+'</td>';
if(u.role==='admin'||u.id===me.id){rows+='<td class="actions-cell" data-label="Thao tác"><span class="muted">—</span></td>'}
else if(u.status==='active'){rows+='<td class="actions-cell" data-label="Thao tác"><button type="button" class="danger toggle" data-id="'+esc(u.id)+'" data-name="'+esc(u.name||u.phone)+'">Khóa</button></td>'}
else{rows+='<td class="actions-cell" data-label="Thao tác"><button type="button" class="toggle" data-id="'+esc(u.id)+'" data-name="'+esc(u.name||u.phone)+'">Mở khóa</button></td>'}
rows+='</tr>'}
$('users').innerHTML='<table class="table"><thead><tr><th>Người dùng</th><th>Liên hệ</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
document.querySelectorAll('.toggle').forEach(b=>b.addEventListener('click',()=>toggle(b)))}
catch(e){$('users').innerHTML='<div class="empty"><span class="face">⚠️</span>Không tải được danh sách.<br><button id="retryUsers" type="button">Thử lại</button></div>';
if($('retryUsers'))$('retryUsers').onclick=loadUsers}}
async function toggle(b){const id=b.dataset.id,name=b.dataset.name,next=b.textContent.trim();
const action=next==='Khóa'?'Khóa':'Mở khóa';
const consequence=action==='Khóa'?'Người dùng sẽ không thể đăng nhập hay dùng ứng dụng cho đến khi được mở khóa.':'Người dùng sẽ đăng nhập và sử dụng ứng dụng trở lại bình thường.';
if(!confirm(action+' tài khoản "'+name+'"?\\n\\n'+consequence))return;
b.disabled=true;b.setAttribute('aria-busy','true');const old=b.textContent;b.textContent='Đang xử lý…';
try{await api('/admin/users/'+id+'/'+(action==='Khóa'?'block':'unblock'),{method:'POST'});
notice((action==='Khóa'?'Đã khóa ':'Đã mở khóa ')+'tài khoản "'+name+'".');loadUsers()}
catch(e){notice(e.message,true);b.disabled=false;b.removeAttribute('aria-busy');b.textContent=old}}
$('logout').addEventListener('click',logout);
$('role').addEventListener('change',()=>{offset=0;loadUsers()});
$('prev').addEventListener('click',()=>{offset=Math.max(0,offset-limit);loadUsers()});
$('next').addEventListener('click',()=>{offset+=limit;loadUsers()});
loadStats();loadUsers()})();
</script></body></html>`));
