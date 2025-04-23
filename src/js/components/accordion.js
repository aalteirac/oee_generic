import Accordion from 'accordion-js';
var cur;
const accordion = {
  openFirst(){
    if(cur){
      cur.open(0)
    }
  },
  closeAll(){
    if(cur){
      cur.closeAll();
    }
  },
  init() {
    const accordions = [...document.querySelectorAll('.accordion')];
    const defaultOptions = {
      elementClass: 'accordion-item',
      triggerClass: 'accordion-header',
      panelClass: 'accordion-body',
      activeClass: 'active',
      duration: 300,
    };

    if (accordions.length) {
      accordions.forEach((accordion) => {
        // Store accordion items
        const accordionItems = [...accordion.querySelectorAll(`.${defaultOptions.elementClass}`)];
        // Store accordion option for each accordion
        const accordionOptions = { ...defaultOptions, openOnInit: [] };

        accordionItems.forEach((item, index) => {
          if (item.classList.contains('active')) {
            // Push default active .accordion-item index
            accordionOptions.openOnInit.push(index);
          }
        });
        if(cur){
          cur.destroy();
        }
        cur =new Accordion(accordion, accordionOptions);
      });
    }
  },
};

export default accordion;
