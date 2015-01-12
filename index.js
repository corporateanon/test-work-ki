(function() {
  var apiUrl = 'http://unthought.net/jobapi/';
  var defaultFolder = 'root';
  var itemsPerPage = 1000;
  var Cache = function() {
    function Cache(ttl) {
      this.ttl = ttl;
      this.items = {};
    }
    Cache.prototype.set = function(key, value) {
      this.items[key] = [Date.now() + this.ttl, value];
    };
    Cache.prototype.get = function(key) {
      var record = this.items[key];
      if (record && record[0] > Date.now()) {
        return record[1];
      }
    };
    return Cache;
  }();
  var FoldersListView = function() {
    function FoldersListView(el) {
      this.el = el;
      el.addEventListener('click', onClick.bind(this));
      this.assets = build(el);
    }

    function onClick(event) {
      var t = event.target;
      var action = t.getAttribute('data-action');
      var value = t.getAttribute('data-value');
      action && notify(this, action, [value]);
    };
    FoldersListView.prototype.setState = function(state) {
      this.state = state;
    };
    FoldersListView.prototype.render = function() {
      console.time('build html');
      var html = this.state.items.map(function(item) {
        return '<div class="folder" data-action="navigate" data-value="' + item.id + '">' + item.name + '</div>';
      }).join('');
      this.assets.list.innerHTML = html;
      this.assets.pagerPage.textContent = 'Page ' + (this.state.page + 1) + ' of ' + this.state.totalPages;
      this.assets.pagerPage.style.display = this.state.totalPages > 1 ? 'inline-block' : 'none';
      this.assets.pagerNext.style.display = this.state.page + 1 < this.state.totalPages ? 'inline-block' : 'none';
      this.assets.pagerPrev.style.display = this.state.page > 0 ? 'inline-block' : 'none';
    };

    function notify(view, signal, attrs) {
      view['on_' + signal].apply(view, attrs);
    }

    function build(el) {
      el.innerHTML = document.querySelector('.template-folders-list-view').innerHTML;
      return {
        list: el.querySelector('.list'),
        pagerPage: el.querySelector('.pager > .page'),
        pagerNext: el.querySelector('.pager > .next'),
        pagerPrev: el.querySelector('.pager > .prev'),
      };
    }
    return FoldersListView;
  }();

  function parseFoldersXml(doc) {
    console.time('parse xml');
    var items = Array.prototype.slice.call(doc.querySelectorAll('folder'))
      .map(function(folder) {
        return {
          id: folder.querySelector('id').textContent,
          name: folder.querySelector('name').textContent,
        }
      });
    console.timeEnd('parse xml');
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
      };
      xhr.open('GET', url, true);
      xhr.send(null);
    }).then(parseFoldersXml).then(function(data) {
      return cache.set(folder, data), data;
    });
  }

  function main() {
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
      getFoldersXml(currentFolder, cache).then(function(items) {
        view.setState({
          items: items.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage),
          page: currentPage,
          totalPages: Math.ceil(items.length / itemsPerPage),
        });
        view.render();
      });
    }
    update();
  }
  main();
})();