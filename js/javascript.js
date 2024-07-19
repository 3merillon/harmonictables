/*
MIT License
Cyril Monkewitz, 2024
*/

let viewport, loader;
const firstId = 'a';
let harmonicBase = BigInt(2);
const maxNodePoolSize = 500;
const nodeCreationTimes = new Map();
let currentSelectedNode = null;
let previousNearestSpaces = [];
const primeCache = new Map();

function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  
  if (primeCache.has(num)) {
    return primeCache.get(num);
  }

  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) {
      primeCache.set(num, false);
      return false;
    }
  }
  
  primeCache.set(num, true);
  return true;
}

const initializeTapspace = () => {
  viewport = tapspace.createView('#tapspace');
  viewport.zoomable();
  let localData = {};

  const getData = (id, parentTopValue = harmonicBase.toString(), parentBottomValue = null) => {
    let content = '';
    let fontSize = 16;
    let img = null;
    let orientation = 0;

    const depth = id.length - 1;
    const index = id.length > 1 ? parseInt(id.slice(1), 36) : 0;
    const isFirstChild = id.endsWith('a');
    const isLastChild = id.endsWith(String.fromCharCode(96 + Number(harmonicBase)));

    let childNumber = 0;
    for (let i = 1; i < id.length; i++) {
      childNumber = childNumber * Number(harmonicBase) + (id.charCodeAt(i) - 97);
    }

    const numeratorTop = index === 0 ? parentTopValue : harmonicBase ** BigInt(depth);
    const baseValue = (harmonicBase ** BigInt(depth)) * harmonicBase - (harmonicBase - BigInt(1));
    const numeratorBottom = baseValue - BigInt(childNumber * (Number(harmonicBase) - 1));

    const topNumberClass = id.split('').every(char => char === 'a') ? 'top-number pink' : 'top-number';

    if (isFirstChild) {
      content = `<div class="${topNumberClass}">${parentTopValue}</div><div class="bottom-number">${numeratorBottom.toString()}</div>`;
    } else if (isLastChild && parentBottomValue !== null) {
      content = `<div class="${topNumberClass}">${numeratorTop.toString()}</div><div class="bottom-number">${parentBottomValue}</div>`;
    } else {
      content = `<div class="${topNumberClass}">${numeratorTop.toString()}</div><div class="bottom-number">${numeratorBottom.toString()}</div>`;
    }
    fontSize = 24;

    const nodes = [];
    for (let i = 0; i < Number(harmonicBase); i++) {
      nodes.push({ id: id + String.fromCharCode(97 + i), x: 1000 * (i + 1), y: 0, parentTopValue: isFirstChild ? parentTopValue : numeratorTop.toString(), parentBottomValue: isLastChild ? numeratorBottom.toString() : null });
    }

    return {
      id: id,
      content: content,
      fontSize: fontSize,
      img: img,
      orientation: orientation,
      parent: id.substring(0, id.length - 1) || null,
      nodes: nodes
    };
  };

  const createPlaceholder = (id) => {
    const space = tapspace.createSpace();
    space.addClass('tree-space');
    space.spaceId = id;
    space.isPlaceholder = true;
    const node = tapspace.createNode(100);
    node.addClass('tree-placeholder');
    space.addChild(node, space.at(0, 0));
    return space;
  };

  const createNode = (id, data) => {
    const space = tapspace.createSpace();
    space.addClass('tree-space');
    space.spaceId = id;

    const item = tapspace.createNode(150);
    item.addClass('tree-node');
    item.element.title = 'id:' + id;
    item.element.style.fontSize = data.fontSize + 'px';
    item.html(data.content);
    item.element.style.backgroundImage = 'url(img/earth.png)';

    const bottomDiv = item.element.querySelector('.bottom-number');
    const bottomNumber = parseInt(bottomDiv.textContent);
    if (isPrime(bottomNumber)) {
      bottomDiv.classList.add('pink');
    }

    item.tappable({ preventDefault: false });
    item.on('tap', (ev) => {
      if (currentSelectedNode && currentSelectedNode !== item) {
        currentSelectedNode.element.style.backgroundImage = 'url(img/earth.png)';
        currentSelectedNode.removeClass('current');
        currentSelectedNode.setContentInput(false);
      }
      item.element.style.backgroundImage = 'url(img/mars.png)';

      const metric = viewport.measureOne(item);
      viewport.animateOnce({ duration: '200ms', easing: 'ease-in' });
      viewport.zoomTo(item, { margin: '30%' });

      currentSelectedNode = item;
      window.getSelection().removeAllRanges();
      updateOpacity();
    });
    item.setContentInput(false);

    space.addChild(item, { x: 0, y: 0 });
    space.item = item;

    return space;
  };

  const updateOpacity = () => {
    const nodes = document.querySelectorAll('.tree-node');
    nodes.forEach(node => {
      const id = node.title.split(':')[1];
      const depth = id.length - 1;
      const currentDepth = currentSelectedNode.element.title.split(':')[1].length - 1;
      const relativeDepth = depth - currentDepth;

      node.classList.remove('opacity-100', 'opacity-50', 'opacity-25', 'opacity-125', 'opacity-0');

      if (relativeDepth === 0) {
        node.classList.add('opacity-100');
      } else if (relativeDepth === -1) {
        node.classList.add('opacity-50');
      } else if (relativeDepth === -2) {
        node.classList.add('opacity-25');
      } else if (relativeDepth === -3) {
        node.classList.add('opacity-125');
      } else if (relativeDepth <= -4) {
        node.classList.add('opacity-0');
      }
    });
  };

  loader = new tapspace.loaders.TreeLoader({
    viewport: viewport,
    mapper: function (parentId, parentSpace, childId) {
      const parentData = localData[parentId];
      const childData = parentData.nodes.find(n => n.id === childId);

      if (childData) {
        const childIndex = childId.charCodeAt(childId.length - 1) - 97;
        const currentHarmonicBase = BigInt(Math.floor(Number(document.getElementById('harmonicBase').value)));
        return parentSpace.getBasis()
          .scaleBy(1 / Number(currentHarmonicBase), parentSpace.atAnchor())
          .offset(300 * Number(currentHarmonicBase) - 150 * (Number(currentHarmonicBase) - 1), 300 * childIndex - 150 * (Number(currentHarmonicBase) - 1));
      }
      return null;
    },
    backmapper: function (childId, childSpace, parentId) {
      return null;
    },
    tracker: function (parentId, parentSpace) {
      const parentData = localData[parentId];
      if (parentData) {
        return parentData.nodes.map(node => node.id);
      }
      return [];
    },
    backtracker: function (childId, childSpace) {
      const childData = localData[childId];
      if (childData) {
        const parentId = childData.parent;
        if (parentId) {
          return parentId;
        }
      }
      return null;
    }
  });

  loader.on('open', (ev) => {
    const id = ev.id;
    const placeholder = createPlaceholder(id);
    loader.addSpace(id, placeholder);

    const parentId = id.substring(0, id.length - 1) || null;
    const parentTopValue = parentId && localData[parentId] ? localData[parentId].content.split('</div>')[0].split('>')[1] : harmonicBase.toString();
    const parentBottomValue = parentId && localData[parentId] ? localData[parentId].content.split('</div>')[1].split('>')[1] : null;

    const data = getData(id, parentTopValue, parentBottomValue);
    localData[id] = data;
    const nodeSpace = createNode(id, data);
    loader.addSpace(id, nodeSpace);
    nodeCreationTimes.set(id, Date.now());

    if (ev.depth > 0) {
      loader.openNeighbors(ev.id, ev.depth);
    }

    if (id === firstId) {
      viewport.requestIdle();
    }
  });

  loader.on('close', (ev) => {
    loader.removeSpace(ev.id);
    nodeCreationTimes.delete(ev.id);
  });

  const updateMeter = () => {
    const numNodes = loader.countSpaces();
    const metersEl = document.querySelector('.meters .count');
    metersEl.innerHTML = numNodes;
  };
  loader.on('opened', updateMeter);
  loader.on('closed', updateMeter);

  viewport.on('idle', () => {
    const spaces = viewport.getSpaces();
    const singulars = viewport.findSingular();
    singulars.forEach(space => {
      const spaceId = space.spaceId;
      loader.removeSpace(spaceId);
    });

    const loadedSpaces = spaces.filter((space) => {
      return !space.isPlaceholder;
    });

    const nearestCount = 5;
    const nearest = viewport.measureNearest(loadedSpaces, nearestCount);
    const nearestSpaces = nearest.map(ne => ne.target).reverse();
    nearestIds = new Set(nearestSpaces.map(space => space.spaceId));

    if (nearestSpaces.length > 0) {
      const nearestNode = nearestSpaces[nearestSpaces.length - 1];
      if (currentSelectedNode && currentSelectedNode !== nearestNode.item) {
        currentSelectedNode.removeClass('current');
        currentSelectedNode.setContentInput(false);
        currentSelectedNode.element.style.backgroundImage = 'url(img/earth.png)';
      }
      nearestNode.item.addClass('current');
      nearestNode.item.setContentInput('pointer');
      nearestNode.item.element.style.backgroundImage = 'url(img/mars.png)';
      currentSelectedNode = nearestNode.item;
      updateOpacity();
    }

    nearestIds.forEach(spaceId => {
      loader.openNeighbors(spaceId, 2);
    });

    viewport.limitTo(nearestSpaces);
    previousNearestSpaces = nearestSpaces;

    if (nearestSpaces.length > 0) {
      cullNodes();
    }
  });

  const cullNodes = () => {
    const allNodes = Array.from(viewport.getSpaces()).map(space => space.spaceId);
    const removableNodes = allNodes.filter(id => !nearestIds.has(id) && !previousNearestSpaces.some(space => space.spaceId === id));
    removableNodes.sort((a, b) => nodeCreationTimes.get(a) - nodeCreationTimes.get(b));

    while (removableNodes.length > 0 && loader.countSpaces() > maxNodePoolSize) {
      const nodeIdToRemove = removableNodes.shift();
      loader.removeSpace(nodeIdToRemove);
      nodeCreationTimes.delete(nodeIdToRemove);
    }
  };

  const firstBasis = viewport.getBasisAt(
    viewport.atCenter().offset(0, -20),
  );
  loader.init(firstId, firstBasis);
};

initializeTapspace();

document.getElementById('harmonicBase').addEventListener('input', (event) => {
  const inputValue = event.target.value;
  const errorMessage = document.getElementById('errorMessage');
  const viewTreeButton = document.getElementById('viewTree');

  const isValidPrime = inputValue !== "" && Number.isInteger(Number(inputValue)) && isPrime(parseInt(inputValue));

  if (!isValidPrime) {
    event.target.setCustomValidity('Please enter a prime number.');
    errorMessage.textContent = 'Please enter a prime number.';
    errorMessage.style.display = 'block';
    viewTreeButton.disabled = true;
  } else {
    event.target.setCustomValidity('');
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
    viewTreeButton.disabled = false;
  }
});

document.getElementById('viewTree').addEventListener('click', () => {
  const newValue = document.getElementById('harmonicBase').value;
  if (newValue === "") {
    return;
  }
  const newHarmonicBase = BigInt(Math.floor(Number(newValue)));
  if (newHarmonicBase !== harmonicBase) {
    harmonicBase = newHarmonicBase;
    const tapspaceContainer = document.getElementById('tapspaceContainer');
    tapspaceContainer.innerHTML = '<div id="tapspace" class="myspaceapp"></div>';
    initializeTapspace();
  }
});