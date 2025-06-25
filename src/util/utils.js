export const storeValue = (keySet, valueSet) => {
  const value = { [keySet]: valueSet };
  chrome.storage.local.set(value, function () {
    console.log("Value is set with key", keySet, "value", valueSet);
  });
};

export const removeValue = (key) => {
  chrome.storage.local.remove(key, () => {
    console.log("Key removed ", key);
  });
};

export const getValue = (keySet) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([keySet], (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result[keySet]);
    });
  });
};
