/**
 * KATAPAYADI ENGINE
 * Logic for converting text (Devanagari/English) into Vedic Numbers.
 */
const KatapayadiEngine = (() => {
    // 1. Core Map (Values)
    const map = {
        'क':1,'ख':2,'ग':3,'घ':4,'ङ':5,'च':6,'छ':7,'ज':8,'झ':9,'ञ':0,
        'ट':1,'ठ':2,'ड':3,'ढ':4,'ण':5,'त':6,'थ':7,'द':8,'ध':9,'न':0,
        'प':1,'फ':2,'ब':3,'भ':4,'म':5,'य':1,'र':2,'ल':3,'व':4,'श':5,'ष':6,'स':7,'ह':8,
        'क्ष':6,'ज्ञ':0 // Atomic
    };
    const vowels = ['अ','आ','इ','ई','उ','ऊ','ए','ऐ','ओ','औ','अं','अः','ऋ'];

    // 2. Dictionary (Overrides)
    const dictionary = {
        "microsoft": "माइक्रोसॉफ्ट्",
        "congress": "काँग्रेस",
        "bjp": "भाजपा",
        "inc": "इंडियन नेशनल काँग्रेस",
        "general electric": "जेनेरल् एलेकट्रिक्"
    };

    // 3. Phonetic Maps
    const phoneMap = {
        'aa':'ा','ai':'ै','au':'ौ','a':'','i':'ि','ee':'ी','u':'ु','oo':'ू','e':'े','o':'ो',
        'ksh':'क्ष','tra':'त्र','gy':'ज्ञ','jny':'ज्ञ','ng':'ं',
        'sh':'श','ch':'च','th':'थ','ph':'फ','gh':'घ','jh':'झ','dh':'ध','bh':'भ','kh':'ख',
        'k':'क','g':'ग','j':'ज','t':'त','d':'द','n':'न','p':'प','f':'फ','b':'ब','m':'म',
        'y':'य','r':'र','l':'ल','v':'व','w':'व','s':'स','h':'ह'
    };
    const sortedKeys = Object.keys(phoneMap).sort((a,b)=>b.length-a.length);

    function isConsonant(char) {
        return map.hasOwnProperty(char) && char !== 'क्ष' && char !== 'ज्ञ'; 
    }

    function transliterate(text) {
        let lower = text.trim().toLowerCase();
        if(dictionary[lower]) return { dev: dictionary[lower], method: 'Dictionary' };

        let dev = "";
        let i = 0;
        let prevWasConsonant = false;

        while(i < lower.length) {
            let found = false;
            for(let key of sortedKeys) {
                if(lower.substr(i, key.length) === key) {
                    let token = phoneMap[key];
                    let isCon = isConsonant(token);
                    
                    if (isCon && prevWasConsonant) dev += '्'; // Auto-Virama
                    dev += token;
                    
                    if (key === 'a' || token.match(/[ा-ौ]/) || token === 'ं') prevWasConsonant = false;
                    else if (isCon) prevWasConsonant = true;
                    else prevWasConsonant = false;

                    i += key.length;
                    found = true;
                    break;
                }
            }
            if(!found) i++;
        }
        if(prevWasConsonant) dev += '्'; // Final Schwa deletion
        return { dev: dev, method: 'Heuristic' };
    }

    function calculate(devText) {
        let clean = devText.replace(/क\u094Dष/g, 'क्ष').replace(/ज\u094Dञ/g, 'ज्ञ');
        let logs = [];
        let vals = [];
        let i = 0;
        
        while(i < clean.length) {
            let c = clean[i];
            let n = clean[i+1]||'';

            if(vowels.includes(c)) {
                logs.push({t:c, v:0, s:'keep'}); vals.push(0); i++; continue;
            }

            if(map.hasOwnProperty(c)) {
                if(n === 'ृ') { // Ri Matra
                    logs.push({t:c+'ृ', v:2, s:'warn'}); vals.push(2); i+=2; continue;
                }
                if(n === '्') { // Virama
                    let nn = clean[i+2];
                    if(nn && (map.hasOwnProperty(nn) || vowels.includes(nn))) {
                        let v = map[c];
                        logs.push({t:c+'्', v:v, s:'keep'}); vals.push(v);
                        i+=2; 
                        if(clean[i] && map.hasOwnProperty(clean[i])) i++; // Skip merged
                    } else {
                        logs.push({t:c+'्', v:null, s:'drop'}); i+=2;
                    }
                    continue;
                }
                let v = map[c];
                logs.push({t:c, v:v, s:'keep'}); vals.push(v);
                i++;
                while(i < clean.length && !map.hasOwnProperty(clean[i]) && !vowels.includes(clean[i])) i++;
            } else {
                i++;
            }
        }

        let rev = [...vals].reverse();
        let sum = parseInt(rev.join('')) || 0;
        let rashi = (sum % 12) === 0 ? 12 : (sum % 12);
        
        return { dev: devText, logs, rev, sum, rashi };
    }

    return { transliterate, calculate };
})();