const storeValue = (keySet, valueSet) => {
    const value = { [keySet]: valueSet }; // <-- dynamic key
    chrome.storage.local.set(value, function() {
        console.log('Value is set with key', keySet, 'value', valueSet);
    });
};

const getValue = (keySet) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([keySet], (result) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result[keySet]);
        });
    });
};