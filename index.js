(function() {
  var apiUrl = 'http://unthought.net/jobapi/';
  var defaultFolder = 'root';

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
      this.assets = build(el);
      attachEvents(this);
    }
    FoldersListView.prototype._onListItemClick = function(event) {
      var t = event.target;
      var id = t.getAttribute('data-id');
      notify(this, 'navigate', [id]);
    };

    FoldersListView.prototype.setItems = function(items) {
      this.items = items;
    };
    FoldersListView.prototype.setPage = function(page) {
      this.page = page;
    };

    FoldersListView.prototype.render = function() {
      debugger
      console.time('build html');
      var html = this.items.slice(0, 10).map(function(item) {
        return '<li class="folder" data-id="' + item.id + '">' + item.name + '</li>';
      }).join('\n');
      console.timeEnd('build html');
      console.time('set html');
      this.assets.list.innerHTML = html;
      console.timeEnd('set html');
    };

    function attachEvents(view) {
      view.assets.list.addEventListener('click', view._onListItemClick.bind(view));
    }

    function notify(view, signal, attrs) {
      view['on_' + signal].apply(view, attrs);
    }

    function build(el) {
      el.innerHTML = '<ul class="list"></ul><div class="pager"><a class="prev"></a><a class="next"></a><span class="page"></span></div>';
      return {
        list: el.querySelector('.list'),
        pagerPage: el.querySelector('.pager > .page'),
        pagerNext: el.querySelector('.pager > .next'),
        pagerPrev: el.querySelector('.pager > .prev'),
      }
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
          if (xhr.status == 200) {
            resolve(xhr.responseXML);
          } else {
            reject(new Error('HTTP ' + xhr.status));
          }
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
    }

    function update() {
      getFoldersXml(currentFolder, cache).then(function(items) {
        view.setItems(items);
        view.setPage(currentPage);
        view.render();
      });
    }
    update();
  }
  main();
})();