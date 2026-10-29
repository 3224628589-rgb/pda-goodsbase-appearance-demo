import { PHOTO_SIDES, initialState, searchProducts, availableAppearances, bindAppearance, saveAppearance } from './model.mjs';

const root = document.querySelector('#app');
let state = initialState();
const ui = { view: 'list', query: '', expanded: new Set(), baseId: null, appearanceId: null, candidateId: null, draftAppearance: null, draftProduct: null, draftPhotos: null, toast: '' };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const product = () => state.products.find(p => p.baseId === ui.baseId);
const appearance = () => state.appearances[ui.appearanceId];

function shell(title, body, footer = '') {
  return `<div class="device" data-view="${ui.view}">
    <div class="statusbar"><span>18:14</span><span class="status-icons">● ▮ 5G　88</span></div>
    <header class="navbar">${ui.view === 'list' ? '<span class="back-spacer"></span>' : '<button class="back-button" data-action="back" aria-label="返回"><span></span></button>'}<h1>${title}</h1><span class="nav-spacer"></span></header>
    ${body}${footer}<div class="systembar"><span></span></div>
    <div class="toast ${ui.toast ? 'show' : ''}" role="status">${escapeHtml(ui.toast)}</div>
  </div>`;
}

function renderList() {
  const matches = searchProducts(state, ui.query);
  const search = `<form class="search-form" id="search-form"><button type="submit" class="search-icon" aria-label="搜索"></button><input id="search-input" name="query" autocomplete="off" placeholder="BaseID/DrugID/品名/条码/批文号" value="${escapeHtml(ui.query)}" aria-label="搜索主商品库"><button type="button" class="clear-search ${ui.query ? '' : 'hidden'}" data-action="clear-search" aria-label="清空搜索">×</button></form>`;
  const cards = matches.map(p => `<article class="product-card" data-base-id="${p.baseId}">
    <div class="card-heading"><h2>${escapeHtml(p.name)}</h2><button class="edit-link" data-action="open-edit" data-base-id="${p.baseId}">编辑</button></div>
    <p class="spec-line">${escapeHtml(p.spec)} ｜ ${escapeHtml(p.manufacturer)}</p>
    <div class="card-meta"><span>${escapeHtml(p.barcode)} ｜ ${escapeHtml(p.approval)}</span><button class="expand-link" data-action="toggle-expand" data-base-id="${p.baseId}" aria-expanded="${ui.expanded.has(p.baseId)}">${ui.expanded.has(p.baseId) ? '收起' : '展开'} <span class="chevron ${ui.expanded.has(p.baseId) ? 'up' : ''}"></span></button></div>
    ${ui.expanded.has(p.baseId) ? `<div class="expanded-details"><div><span>BaseID</span><b>${p.baseId}</b></div><div><span>DrugID</span><b>${p.drugId}</b></div><div><span>RelatedDrugID</span><b>${p.relatedDrugId}</b></div><div><span>关联外观</span><b>${(state.links[p.baseId] ?? []).length} 套</b></div><div><span>存储分类</span><b>${escapeHtml(p.storage)}</b></div><div><span>处方分类</span><b>${escapeHtml(p.presCategory)}</b></div></div>` : ''}
  </article>`).join('');
  const empty = `<div class="empty"><strong>没有找到商品</strong><p>可输入 BaseID、DrugID、品名、条码或批文号重新搜索</p><button data-action="clear-search">清空搜索</button></div>`;
  return shell('主库商品清单', `<div class="list-toolbar">${search}</div><div class="page-scroll list-scroll">${cards || empty}</div>`);
}

function photoGrid(photos, editable = false) {
  return `<div class="photo-grid">${PHOTO_SIDES.map(([side, label]) => `<div class="photo-cell"><div class="photo-label">${label}</div><div class="photo-box">${photos?.[side] ? `<img src="${escapeHtml(photos[side])}" alt="${label}">` : `<span class="photo-empty">${editable ? '点击添加' : '暂无图片'}</span>`}${editable ? `<button class="photo-hit" data-action="upload-photo" data-side="${side}" aria-label="${photos?.[side] ? `更换${label}` : `添加${label}`}"></button>${photos?.[side] ? `<button class="delete-photo" data-action="delete-photo" data-side="${side}" aria-label="删除${label}">×</button>` : ''}` : ''}</div></div>`).join('')}</div>`;
}

function previewCard(a) {
  return `<button class="appearance-preview" data-action="open-appearance" data-appearance-id="${a.id}" aria-label="查看 ${a.id} 外观特征详情"><img src="${escapeHtml(a.photos.front)}" alt=""><img src="${escapeHtml(a.photos.right)}" alt=""><span class="preview-fade"></span><span class="preview-title">${a.id}外观<span class="preview-arrow">▶</span></span></button>`;
}

function plainField(label, key, value) {
  return `<label class="field-row"><span>${label}</span><input name="${key}" data-field="product" data-key="${key}" value="${escapeHtml(value)}"></label>`;
}

function renderEdit() {
  const p = product();
  if (!p) return renderList();
  const links = (state.links[p.baseId] ?? []).map(id => state.appearances[id]).filter(Boolean);
  const content = `<div class="section-heading">商品基础信息</div><section class="main-panel">
    <div class="group-label">商品图片</div>${photoGrid(ui.draftPhotos, true)}
    <div class="appearance-list">${links.map(previewCard).join('')}
      <button class="add-appearance" data-action="open-picker">增加新的外观特征</button>
    </div>
    <div class="product-fields">
      ${plainField('商品名称*', 'name', ui.draftProduct.name)}
      ${plainField('规格', 'spec', ui.draftProduct.spec)}
      ${plainField('生产厂家', 'manufacturer', ui.draftProduct.manufacturer)}
      ${plainField('条码', 'barcode', ui.draftProduct.barcode)}
      ${plainField('批准文号', 'approval', ui.draftProduct.approval)}
      <div class="field-row readonly"><span>BaseID</span><strong>${p.baseId}</strong></div>
      <div class="field-row readonly"><span>DrugID</span><strong>${p.drugId}</strong></div>
      <div class="field-row readonly"><span>RelatedDrugID</span><strong>${p.relatedDrugId}</strong></div>
    </div>
  </section>`;
  return shell('商品编辑', `<div class="page-scroll form-scroll">${content}</div><input id="photo-input" type="file" accept="image/*" hidden>`, footer('cancel-edit', 'save-product'));
}

const choices = {
  packType: ['盒装', '袋装(不易变形)', '袋装(易变形)', '大瓶装', '小瓶装', '片装', '异形', '其他'],
  placement: ['竖放', '横放'], shape: ['长方体', '圆柱体', '锥体', '异形', '片状'],
  material: ['纸盒', '金属', '亚克力', '海绵', '玻璃', '橡胶', '塑料'],
  fragile: ['否', '是'], hasBarcode: ['否', '是'], hasTraceCode: ['否', '是'], reflective: ['否', '是'],
  tracePosition: ['正面', '非正面', '头顶(仅瓶装)', '瓶身(仅瓶装)'],
  barcodePosition: ['正面', '非正面', '头顶(仅瓶装)', '瓶身(仅瓶装)'],
};

function appearanceField(label, key, value, unit = '') {
  if (choices[key]) return `<label class="field-row"><span>${label}</span><select data-field="appearance" data-key="${key}">${choices[key].map(option => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`;
  return `<label class="field-row"><span>${label}</span><div class="input-unit"><input data-field="appearance" data-key="${key}" value="${escapeHtml(value)}" ${unit ? 'inputmode="decimal"' : ''}>${unit ? `<em>${unit}</em>` : ''}</div></label>`;
}

function renderAppearance() {
  const a = appearance();
  if (!a || !ui.draftAppearance) return renderEdit();
  const d = ui.draftAppearance;
  const content = `<div class="section-heading">外观特征基础信息</div><section class="main-panel appearance-panel"><div class="group-label">商品图片</div>${photoGrid(d.photos)}
    <div class="appearance-fields">
      <div class="field-row readonly"><span>外观编号</span><strong>${a.id}</strong></div>
      ${appearanceField('重量', 'weight', d.weight, 'g')}
      ${appearanceField('长', 'length', d.length, 'mm')}
      ${appearanceField('宽', 'width', d.width, 'mm')}
      ${appearanceField('高', 'height', d.height, 'mm')}
      ${appearanceField('包装类型', 'packType', d.packType)}
      ${appearanceField('摆放方式', 'placement', d.placement)}
      ${appearanceField('几何形状', 'shape', d.shape)}
      ${appearanceField('包装材质', 'material', d.material)}
      ${appearanceField('表面结构', 'surface', d.surface)}
      ${appearanceField('是否易碎', 'fragile', d.fragile)}
      ${appearanceField('是否有商品条码', 'hasBarcode', d.hasBarcode)}
      ${appearanceField('是否有溯源码', 'hasTraceCode', d.hasTraceCode)}
      ${appearanceField('溯源码位置', 'tracePosition', d.tracePosition)}
      ${appearanceField('条码位置', 'barcodePosition', d.barcodePosition)}
      ${appearanceField('是否反光', 'reflective', d.reflective)}
    </div>
  </section>`;
  return shell('外观特征', `<div class="page-scroll form-scroll">${content}</div>`, footer('cancel-appearance', 'save-appearance'));
}

function renderPicker() {
  const p = product();
  if (!p) return renderList();
  const options = availableAppearances(state, p.baseId);
  const cards = options.map(a => `<button class="candidate-card ${ui.candidateId === a.id ? 'selected' : ''}" data-action="select-candidate" data-appearance-id="${a.id}" aria-pressed="${ui.candidateId === a.id}">
      <img src="${escapeHtml(a.photos.front)}" alt=""><div><strong>${a.id} 外观</strong><span>${escapeHtml(a.note)}</span><small>重量 ${a.weight}g　${a.packType} · ${a.placement}</small></div><span class="radio-dot"></span>
    </button>`).join('');
  return shell('选择外观特征', `<div class="page-scroll picker-scroll"><div class="picker-intro"><strong>选择同一关联药品下的外观</strong><p>当前 BaseID ${p.baseId} · RelatedDrugID ${p.relatedDrugId}</p></div>${cards || `<div class="empty"><strong>暂无可关联的外观</strong><p>同一 RelatedDrugID 下的其它外观已全部关联。</p></div>`}</div>`, footer('cancel-picker', 'bind-candidate', !ui.candidateId));
}

function footer(cancel, primary, disabled = false) {
  const labels = { 'cancel-edit':'取消', 'save-product':'保存', 'cancel-appearance':'取消', 'save-appearance':'保存', 'cancel-picker':'取消', 'bind-candidate':'确认关联' };
  return `<div class="bottom-actions"><button class="secondary-action" data-action="${cancel}">${labels[cancel]}</button><button class="primary-action" data-action="${primary}" ${disabled ? 'disabled' : ''}>${labels[primary]}</button></div>`;
}

function render() {
  root.innerHTML = ui.view === 'list' ? renderList() : ui.view === 'edit' ? renderEdit() : ui.view === 'appearance' ? renderAppearance() : renderPicker();
}

let toastTimer;
function toast(message) {
  ui.toast = message;
  const node = root.querySelector('.toast');
  if (node) { node.textContent = message; node.classList.add('show'); }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = ''; root.querySelector('.toast')?.classList.remove('show'); }, 2500);
}

function goBack() {
  ui.toast = '';
  if (ui.view === 'appearance' || ui.view === 'picker') { ui.view = 'edit'; ui.candidateId = null; ui.draftAppearance = null; }
  else if (ui.view === 'edit') { ui.view = 'list'; ui.draftProduct = null; ui.draftPhotos = null; }
  render();
}

root.addEventListener('submit', event => {
  if (event.target.id !== 'search-form') return;
  event.preventDefault();
  ui.query = event.target.elements.query.value.trim();
  render();
});

root.addEventListener('input', event => {
  const target = event.target;
  if (target.dataset.field === 'product' && ui.draftProduct) ui.draftProduct[target.dataset.key] = target.value;
  if (target.dataset.field === 'appearance' && ui.draftAppearance) ui.draftAppearance[target.dataset.key] = target.value;
});

root.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'photo-input' && target.files[0]) {
    const side = target.dataset.side;
    ui.draftPhotos[side] = URL.createObjectURL(target.files[0]);
    render(); toast('商品图片已更新（仅本次演示）');
  }
});

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action } = target.dataset;
  if (action === 'back' || action.startsWith('cancel-')) return goBack();
  if (action === 'clear-search') { ui.query = ''; render(); root.querySelector('#search-input')?.focus(); return; }
  if (action === 'toggle-expand') { const id = Number(target.dataset.baseId); ui.expanded.has(id) ? ui.expanded.delete(id) : ui.expanded.add(id); render(); return; }
  if (action === 'open-edit') { ui.toast = ''; ui.baseId = Number(target.dataset.baseId); ui.draftProduct = structuredClone(product()); ui.draftPhotos = { ...state.productPhotos[ui.baseId] }; ui.view = 'edit'; render(); return; }
  if (action === 'open-appearance') { ui.toast = ''; ui.appearanceId = Number(target.dataset.appearanceId); ui.draftAppearance = structuredClone(appearance()); ui.view = 'appearance'; render(); return; }
  if (action === 'open-picker') { ui.toast = ''; ui.candidateId = null; ui.view = 'picker'; render(); return; }
  if (action === 'select-candidate') { ui.candidateId = Number(target.dataset.appearanceId); render(); return; }
  if (action === 'bind-candidate') {
    if (!ui.candidateId) return;
    const result = bindAppearance(state, ui.baseId, ui.candidateId);
    if (!result.ok) return toast(result.reason);
    state = result.state; ui.candidateId = null; ui.view = 'edit'; render(); toast('外观特征已关联当前 BaseID'); return;
  }
  if (action === 'save-appearance') {
    const result = saveAppearance(state, ui.appearanceId, ui.draftAppearance);
    if (!result.ok) return toast(result.reason);
    state = result.state; ui.view = 'edit'; ui.draftAppearance = null; render(); toast('外观特征已保存'); return;
  }
  if (action === 'save-product') {
    if (!ui.draftProduct.name.trim()) return toast('请输入商品名称');
    state = { ...state, products: state.products.map(p => p.baseId === ui.baseId ? { ...p, ...ui.draftProduct, baseId: p.baseId, drugId: p.drugId, relatedDrugId: p.relatedDrugId } : p), productPhotos: { ...state.productPhotos, [ui.baseId]: { ...ui.draftPhotos } } };
    ui.query = ''; ui.view = 'list'; ui.draftProduct = null; ui.draftPhotos = null; render(); toast('商品修改成功'); return;
  }
  if (action === 'delete-photo') { ui.draftPhotos[target.dataset.side] = null; render(); return; }
  if (action === 'upload-photo') { const input = root.querySelector('#photo-input'); input.dataset.side = target.dataset.side; input.click(); return; }
});

document.addEventListener('keydown', event => { if (event.key === 'Escape' && ui.view !== 'list') goBack(); });
render();
