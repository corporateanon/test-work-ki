(function(apiUrl, defaultFolder, itemsPerPage) {
  function Cache(ttl) {
    this.ttl = ttl;
    this.items = {};
  }
  Cache.prototype.set = function(key, value) {
    this.items[key] = [Date.now() + this.ttl, value];
  };
  Cache.prototype.get = function(key) {
    var record = this.items[key];
    return (record && record[0] > Date.now()) ? record[1] : undefined;
  };

  function FoldersListView(el) {
    this.el = el;
    el.addEventListener('click', function(event) {
      var data = event.target.dataset
      data.action && this['on_' + data.action].apply(this, [data.value]);
    }.bind(this));
    el.innerHTML = document.querySelector('.template-folders-list-view').innerHTML;
    this.assets = [el.querySelector('.list'), el.querySelector('.pager > .page'), el.querySelector('.pager > .next'), el.querySelector('.pager > .prev'), el.querySelector('.loading'), ];
  }
  FoldersListView.prototype.setState = function(state) {
    this.state = state;
  };
  FoldersListView.prototype.setLoading = function(loading) {
    this.assets[4].classList.toggle('visible', loading)
  };
  FoldersListView.prototype.render = function(assets, state) {
    var html = (state = this.state).items.map(function(item) {
      return '<div class="folder" data-action="navigate" data-value="' + item.id + '">' + item.name + '</div>';
    }).join('');
    (assets = this.assets)[0].innerHTML = html;
    assets[1].textContent = 'Page ' + (state.page + 1) + ' of ' + state.totalPages;
    assets[1].style.display = state.totalPages > 1 ? 'inline-block' : 'none';
    assets[2].style.display = state.page + 1 < state.totalPages ? 'inline-block' : 'none';
    assets[3].style.display = state.page > 0 ? 'inline-block' : 'none';
  };

  function parseFoldersXml(doc) {
    var items = Array.prototype.slice.call(doc.querySelectorAll('folder'))
      .map(function(folder) {
        return {
          id: folder.querySelector('id').textContent,
          name: folder.querySelector('name').textContent,
        }
      });
    return items;
  }

  function getFoldersXml(folder, cache) {
    var cached = cache.get(folder);
    return cached ? Promise.resolve(cached) : new Promise(function(resolve, reject) {
      var url = [apiUrl, folder].join('/');
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          xhr.status === 200 ? resolve(xhr.responseXML) : reject(new Error('HTTP ' + xhr.status));
        }
      }
      xhr.open('GET', url, true) || xhr.send(null);
    }).then(parseFoldersXml).then(function(data) {
      return cache.set(folder, data), data;
    });
  }

  //----------------------------------------------------------------------
  var cache = new Cache(60000);
  var view = new FoldersListView(document.getElementById('folders'));
  var currentFolder = defaultFolder;
  var currentPage = 0;
  view.on_navigate = function(id) {
    currentFolder = id;
    currentPage = 0;
    update();
  };
  view.on_page = function(incr) {
    currentPage = currentPage + parseInt(incr, 10);
    update();
  };

  function update() {
    view.setLoading(true);
    getFoldersXml(currentFolder, cache).then(function(items) {
      view.setState({
        items: items.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage),
        page: currentPage,
        totalPages: Math.ceil(items.length / itemsPerPage),
      });
      view.render();
      view.setLoading(false);
    }, view.setLoading.bind(view, false));
  }
  update();
})('http://unthought.net/jobapi/', 'root', 1000);