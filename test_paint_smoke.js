// дымовой тест отрисовки: проверяет, что новые эффекты рисуются без ошибок
const stub=()=>{const o={_attrs:{},innerHTML:'',isConnected:true,children:[],
 setAttribute(k,v){o._attrs[k]=v},appendChild(c){o.children.push(c);c.parentNode=o;o.lastChild=c;return c},remove(){},
 querySelector(){return stub()},getBoundingClientRect(){return{width:400,height:230}},
 viewBox:{baseVal:{x:0,y:0,width:1000,height:575}},id:'',textContent:''};
 o.parentNode=null;return o};
global.document={createElementNS:()=>stub(),hidden:false,getElementById:()=>null,createElement:()=>stub(),body:stub()};
global.window=global;global.requestAnimationFrame=()=>0;
const M=require('./military_map.js');const {MM,paint,step,mk,setMask,setEnv}=M;
const CW=500,CH=288,mask=new Uint8Array(CW*CH);for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)if(x<250)mask[y*CW+x]=1;setMask(mask);
setEnv({S:()=>({money:0}),save(){},toast(){},wars:()=>[],regionAt:()=>null});
MM.svg=stub();MM.svg.parentNode=null;
const a=mk('me','inf',100,100,{dug:true}),b=mk('Враг','tank',104,100),ft=mk('Враг','fort',120,100,{build:1,hp:40}),sh=mk('me','destroyer',700,100),pl=mk('me','fighter',300,300,{fuel:100});
sh.path=[[760,100]];pl.path=[[400,300]];a.fight=0;
for(let i=0;i<30;i++){MM.units.forEach(u=>u.hp=Math.max(u.hp,i==29?0:5));step(.1);paint()}
MM.units.forEach(u=>u.hp=0);step(.1);MM.units.length=0;
for(let i=0;i<40;i++){step(.1);paint()}
console.log('OK: paint без ошибок, fx:',MM.fx.length);process.exit(0);
