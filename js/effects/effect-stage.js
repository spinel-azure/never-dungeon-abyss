// CSS translation is expressed in rendered pixels, while the effect uses logical
// canvas coordinates. Individual translate leaves existing transforms untouched.
export function createStageShake(elements, reference, getSize) {
  const originals=new Map(elements.filter(Boolean).map(element=>[element,element.style.translate]));
  return ({x,y})=>{
    const size=getSize();
    for(const [element,original] of originals) element.style.translate=x||y
      ? `${x*reference.clientWidth/size.width}px ${y*reference.clientHeight/size.height}px`
      : original;
  };
}
