import React, {useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import MinecraftWindow from './MinecraftWindow';
import McButton from './McButton';
import McSlider from './McSlider';
import McSprite, {mcPosition} from './McSprite';
import styles from './MinecraftWindowDemo.module.css';

const mapModes = [['normal', '普通'], ['small', '缩小'], ['duplicate', '复制'], ['lock', '锁定']];

function MapPreview({mode}) {
  if (mode === 'small') return <McSprite name="cartography_table/scaled_map" x={67} y={13} width={66} height={66} />;
  if (mode === 'duplicate') return <>
    <McSprite name="cartography_table/duplicated_map" x={83} y={13} width={50} height={66} />
    <McSprite name="cartography_table/duplicated_map" x={67} y={29} width={50} height={66} />
  </>;
  return <>
    <McSprite name="cartography_table/map" x={67} y={13} width={66} height={66} />
    {mode === 'lock' && <McSprite name="cartography_table/locked" x={118} y={60} width={10} height={14} />}
  </>;
}

export default function MinecraftWindowDemo({type}) {
  const [progress, setProgress] = useState(50);
  const [fuel, setFuel] = useState(75);
  const [name, setName] = useState('我的笔记');
  const [selected, setSelected] = useState(type === 'enchantment' ? -1 : 0);
  const [mapMode, setMapMode] = useState('normal');
  const [disabledSlots, setDisabledSlots] = useState([4]);
  const [powered, setPowered] = useState(false);
  const itemBase = useBaseUrl('/img/mc/item/');
  const spriteBase = useBaseUrl('/img/mc/sprites/');
  const isFurnace = type === 'furnace';
  const icon = (id, label, count) => ({icon: id, name: label, count});
  const book = icon('book', '书');
  let layout = [];
  let items = {};
  if (type === 'dispenser') { layout = ['###', '#B#', '###']; items = {B: book}; }
  if (isFurnace) { layout = ['IFR']; items = {I: icon('raw_iron', '粗铁'), F: icon('coal', '煤炭'), R: icon('iron_ingot', '铁锭')}; }
  if (type === 'brewing') { layout = ['PPPIF']; items = {P: icon('potion', '药水'), I: icon('nether_wart', '下界疣'), F: icon('blaze_powder', '烈焰粉')}; }
  if (type === 'anvil') { layout = ['B#R']; items = {B: icon('book', '我的笔记'), R: icon('book', name || '书')}; }
  if (type === 'enchantment') { layout = ['BL']; items = {B: book, L: icon('lapis_lazuli', '青金石', 3)}; }
  if (type === 'cartography') { layout = ['M##']; items = {M: icon('map', '地图')}; }
  const titles = {furnace: '烧炼预览', anvil: '输入文本', brewing: '酿造预览', stonecutter: '选择物品', enchantment: '附魔预览', merchant: '书商', cartography: '地图预览', crafter: '设置合成槽位', dispenser: '选择分类', dropper: '选择分类'};
  const title = titles[type];
  const choices = type === 'stonecutter' ? ['钻石', '铁锭', '绿宝石', '青金石'] : type === 'enchantment' ? ['锋利 I', '耐久 II', '效率 III'] : ['3 个绿宝石 → 书', '1 个绿宝石 → 纸', '5 个绿宝石 → 书与笔'];
  const optionButton = (index, x, y, width, height, sprite, children) => <button key={index} type="button"
    className={`${styles.option} ${type === 'merchant' ? styles.trade : ''}`} aria-label={choices[index]} aria-pressed={selected === index}
    onClick={() => setSelected(index)} style={{...mcPosition(x, y, width, height), backgroundImage: sprite ? `url(${spriteBase}${sprite}.png)` : undefined}}>{children}</button>;

  return <div className={styles.demo}>
    <MinecraftWindow type={type} title={title} playerInventory layout={layout} items={items}>
      {isFurnace && <>
        <McSprite name="furnace/burn_progress" x={79} y={34} width={24} height={16} clip={`inset(0 ${100 - progress}% 0 0)`} />
        <McSprite name="furnace/lit_progress" x={56} y={36} width={14} height={14} clip={`inset(${100 - fuel}% 0 0 0)`} />
      </>}
      {type === 'brewing' && <>
        <McSprite name="brewing_stand/brew_progress" x={97} y={16} width={9} height={28} clip={`inset(0 0 ${100 - progress}% 0)`} />
        <McSprite name="brewing_stand/fuel_length" x={60} y={44} width={18} height={4} clip={`inset(0 ${100 - fuel}% 0 0)`} />
        <McSprite name="brewing_stand/bubbles" x={63} y={14} width={12} height={29} clip={`inset(${100 - progress}% 0 0 0)`} />
      </>}
      {type === 'anvil' && <>
        <McSprite name="anvil/text_field" x={59} y={20} width={110} height={16} />
        <input className={styles.rename} style={mcPosition(62, 22, 103, 12)} aria-label="铁砧输入文本" maxLength={50} value={name} onChange={event => setName(event.target.value)} />
      </>}
      {type === 'stonecutter' && <>
        {choices.map((label, index) => optionButton(index, 52 + index * 16, 15, 16, 18,
          `stonecutter/recipe${selected === index ? '_selected' : ''}`,
          <img className="no-zoom" src={`${itemBase}${['diamond', 'iron_ingot', 'emerald', 'lapis_lazuli'][index]}.png`} alt="" />))}
        <McSprite name="stonecutter/scroller_disabled" x={119} y={15} width={12} height={15} />
      </>}
      {type === 'enchantment' && choices.map((label, index) => optionButton(index, 60, 14 + index * 19, 108, 19,
        `enchanting_table/enchantment_slot${selected === index ? '_highlighted' : ''}`, <><span>{label}</span><span className={styles.cost}>{[1, 8, 30][index]}</span></>))}
      {type === 'merchant' && <>
        {choices.map((label, index) => optionButton(index, 5, 18 + index * 20, 88, 20, null, <>
          <img className="no-zoom" src={`${itemBase}emerald.png`} alt="" /><span>{[3, 1, 5][index]}</span>
          <img className="no-zoom" src={`${spriteBase}villager/trade_arrow.png`} alt="" />
          <img className="no-zoom" src={`${itemBase}${['book', 'paper', 'writable_book'][index]}.png`} alt="" />
        </>))}
        <McSprite name="villager/scroller_disabled" x={94} y={18} width={6} height={27} />
      </>}
      {type === 'cartography' && <MapPreview mode={mapMode} />}
      {type === 'crafter' && <>
        <McSprite name={`crafter/${powered ? 'powered' : 'unpowered'}_redstone`} x={97} y={35} width={16} height={16} />
        {Array.from({length: 9}, (_, index) => <button key={index} type="button" className={styles.crafterSlot}
          aria-label={`合成槽 ${index + 1}`} aria-pressed={disabledSlots.includes(index)}
          onClick={() => setDisabledSlots(slots => slots.includes(index) ? slots.filter(slot => slot !== index) : [...slots, index])}
          style={{...mcPosition(25 + index % 3 * 18, 16 + Math.floor(index / 3) * 18, 18, 18), backgroundImage: disabledSlots.includes(index) ? `url(${spriteBase}crafter/disabled_slot.png)` : undefined}} />)}
      </>}
    </MinecraftWindow>
    {(isFurnace || type === 'brewing') && <div className={styles.sliders}>
      <McSlider label={isFurnace ? '烧炼进度' : '酿造进度'} value={progress} onChange={setProgress} />
      <McSlider label="燃料剩余" value={fuel} onChange={setFuel} />
    </div>}
    {type === 'cartography' && <div className={styles.controls}>
      {mapModes.map(([id, label]) => <McButton key={id} selected={mapMode === id} onClick={() => setMapMode(id)}>{label}</McButton>)}
    </div>}
    {type === 'crafter' && <div className={styles.controls}>
      <McButton selected={powered} onClick={() => setPowered(value => !value)}>红石信号：{powered ? '开启' : '关闭'}</McButton>
      <McButton onClick={() => {setDisabledSlots([4]); setPowered(false);}}>重置</McButton>
    </div>}
    <div className={styles.status} aria-live="polite">
      {type === 'anvil' && `当前输入：${name || '（空）'}`}
      {['stonecutter', 'enchantment', 'merchant'].includes(type) && `当前选择：${selected < 0 ? '尚未选择' : choices[selected]}`}
      {type === 'crafter' && `点击九个输入槽切换状态。已禁用 ${disabledSlots.length} 格；按下为禁用，弹起为启用。`}
    </div>
  </div>;
}
