(function() {
  var apiUrl = 'http://unthought.net/jobapi/';
  var defaultFolder = 'root';

  var FoldersListView = function() {
    function FoldersListView(el) {
      this.el = el;
      attachEvents(this);
    }
    FoldersListView.prototype._onClick = function(event) {
      var t = event.target;
      var id = t.getAttribute('data-id');
      notify(this, 'navigate', [id]);
    };

    FoldersListView.prototype.setItems = function(items) {
      this.items = items;
    }
    FoldersListView.prototype.render = function() {
      var html = this.items.map(function(item) {
        return '<li class="folder" data-id="' + item.id + '">' + item.name + '</li>';
      }).join('\n');
      this.el.innerHTML = html;
    };

    function attachEvents(view) {
      view.el.addEventListener('click', view._onClick.bind(view));
    }

    function notify(view, signal, attrs) {
      view['on_' + signal].apply(view, attrs);
    }

    return FoldersListView;
  }();

  function parseFoldersXml(doc) {
    return Array.prototype.slice.call(doc.querySelectorAll('folder'))
      .map(function(folder) {
        return {
          id: folder.querySelector('id').textContent,
          name: folder.querySelector('name').textContent,
        }
      });
  }

  function getFoldersXml(folder) {
    return new Promise(function(resolve, reject) {
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
    }).then(parseFoldersXml);
  }

  function main() {
    var view = new FoldersListView(document.getElementById('folders'));
    var currentFolder = defaultFolder;
    view.on_navigate = function (id) {
      currentFolder = id;
      update();
    }

    function update() {
      getFoldersXml(currentFolder).then(function(items) {
        view.setItems(items);
        view.render();
      });
    }
    update();
  }
  main();
})();
