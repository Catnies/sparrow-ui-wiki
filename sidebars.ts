import sidebarsEn from './sidebars/en';
import sidebarsZhHans from './sidebars/zh-hans';

function getSidebarsForLocale() {
    switch (process.env.DOCUSAURUS_CURRENT_LOCALE || 'en') {
        case 'zh-Hans':
            return sidebarsZhHans
        case 'en':
        default:
            return sidebarsEn
    }
}

export default getSidebarsForLocale()