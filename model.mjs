export const PHOTO_SIDES = [
  ['front', '正面图'], ['back', '背面图'], ['left', '左侧图'],
  ['right', '右侧图'], ['top', '上面图'], ['bottom', '下面图'],
];

export const products = [
  { baseId: 100421, drugId: 583217, relatedDrugId: 88107, name: '达因 伊可新 维生素AD滴剂', spec: '30粒(A1500*D500)(0-1岁)', manufacturer: '山东达因海洋生物制药股份有限公司', barcode: '6927852700046', approval: '国药准字H37022973', packType: '盒装', storage: '常温', presCategory: '非处方药' },
  { baseId: 100422, drugId: 583218, relatedDrugId: 88108, name: '易克 双氯芬酸钠缓释胶囊', spec: '50mg*12粒*2板', manufacturer: '南京易亨制药有限公司', barcode: '6937907000175', approval: '国药准字H20066213', packType: '盒装', storage: '常温', presCategory: '处方药' },
  { baseId: 100423, drugId: 583219, relatedDrugId: 88109, name: '逸舒 尼美舒利胶囊', spec: '0.1g*10粒', manufacturer: '广东逸舒制药股份有限公司', barcode: '6933362888655', approval: '国药准字H20073863', packType: '盒装', storage: '常温', presCategory: '处方药' },
  { baseId: 100424, drugId: 583220, relatedDrugId: 88110, name: '敖东 断血流胶囊', spec: '0.35g*12粒*2板', manufacturer: '吉林敖东集团力源制药股份有限公司', barcode: '6921211500100', approval: '国药准字Z20043768', packType: '盒装', storage: '常温', presCategory: '非处方药' },
  { baseId: 100425, drugId: 583221, relatedDrugId: 88111, name: '达力芬 头孢克肟胶囊', spec: '0.1g*6粒', manufacturer: '国药集团致君(深圳)制药有限公司', barcode: '6907031220107', approval: '国药准字H20020513', packType: '盒装', storage: '常温', presCategory: '处方药' },
  { baseId: 100426, drugId: 583222, relatedDrugId: 88112, name: '康弘 松龄 松龄血脉康胶囊', spec: '0.5g*30粒', manufacturer: '四川济生堂药业有限公司', barcode: '6901097783158', approval: '国药准字Z20010121', packType: '盒装', storage: '常温', presCategory: '处方药' },
];

const appearance = (id, relatedDrugId, note, overrides = {}) => ({
  id, relatedDrugId, note, weight: '24.5', length: '74', width: '36', height: '106',
  packType: '盒装', placement: '竖放', shape: '长方体', material: '纸盒',
  surface: '平整、有塑膜', fragile: '否', hasBarcode: '是', hasTraceCode: '是',
  tracePosition: '非正面', barcodePosition: '非正面', reflective: '否',
  photos: Object.fromEntries(PHOTO_SIDES.map(([key]) => [key, `assets/${key}.jpg`])),
  ...overrides,
});

export const initialAppearances = {
  177: appearance(177, 88107, '已关联外观', { weight: '24.5' }),
  178: appearance(178, 88107, '已关联外观', { weight: '25.2', length: '75', reflective: '是' }),
  179: appearance(179, 88107, '同关联药品下的候选外观', { weight: '24.8', height: '107', barcodePosition: '正面' }),
  201: appearance(201, 88108, '其它关联药品的外观', { weight: '18.6' }),
  202: appearance(202, 88108, '同关联药品下的候选外观', { weight: '19.0', material: '塑料' }),
  301: appearance(301, 88109, '其它关联药品的外观'),
};

export function initialState() {
  return {
    products: structuredClone(products),
    appearances: structuredClone(initialAppearances),
    links: { 100421: [177, 178], 100422: [201], 100423: [301], 100424: [], 100425: [], 100426: [] },
    productPhotos: Object.fromEntries(products.map(p => [p.baseId, Object.fromEntries(PHOTO_SIDES.map(([key]) => [key, `assets/${key}.jpg`]))])),
  };
}

export function searchProducts(state, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return state.products;
  return state.products.filter(p =>
    String(p.baseId) === q || [p.drugId, p.name, p.barcode, p.approval]
      .some(value => String(value ?? '').toLowerCase().includes(q))
  );
}

export function availableAppearances(state, baseId) {
  const product = state.products.find(p => p.baseId === Number(baseId));
  if (!product) return [];
  const linked = new Set(state.links[product.baseId] ?? []);
  return Object.values(state.appearances)
    .filter(a => a.relatedDrugId === product.relatedDrugId && !linked.has(a.id))
    .sort((a, b) => a.id - b.id);
}

export function bindAppearance(state, baseId, appearanceId) {
  const product = state.products.find(p => p.baseId === Number(baseId));
  const item = state.appearances[appearanceId];
  if (!product || !item) return { ok: false, reason: '商品或外观不存在' };
  if (product.relatedDrugId !== item.relatedDrugId) return { ok: false, reason: '只能绑定同一 RelatedDrugID 下的外观特征' };
  if ((state.links[product.baseId] ?? []).includes(item.id)) return { ok: false, reason: '这套外观已关联当前 BaseID' };
  return { ok: true, state: { ...state, links: { ...state.links, [product.baseId]: [...(state.links[product.baseId] ?? []), item.id] } } };
}

export function saveAppearance(state, appearanceId, values) {
  const old = state.appearances[appearanceId];
  if (!old) return { ok: false, reason: '外观特征不存在' };
  const numbers = ['weight', 'length', 'width', 'height'];
  for (const key of numbers) {
    const value = String(values[key] ?? '').trim();
    if (value && (!Number.isFinite(Number(value)) || Number(value) <= 0)) return { ok: false, reason: `${{weight:'重量',length:'长',width:'宽',height:'高'}[key]}需填写大于 0 的数字` };
  }
  const next = { ...old, ...values, id: old.id, relatedDrugId: old.relatedDrugId, photos: old.photos };
  return { ok: true, state: { ...state, appearances: { ...state.appearances, [appearanceId]: next } } };
}
