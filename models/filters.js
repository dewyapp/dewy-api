exports.get = function(user, url, filterSet) {
  filterSet = typeof filterSet !== 'undefined' ? filterSet : filters;
  // Comb through filters to get matching one
  for (var i=0; i<filterSet.length; i++) {
    if (filterSet[i].url && filterSet[i].url == url) {
      return filterSet[i];
    }
    else if (filterSet[i].children) {
      // Comb through children recursively until a match is made
      result = this.get(null, url, filterSet[i].children);
      if (result) {
        return result;
      }
    }
  }

  return newFilter;
}

exports.getAll = function(user) {
  // Dummy function for now, will eventually pull from persistence layer
  return filters;
}

filters = [
  {
    id: '1',
    title: 'In development',
    url: 'in-development',
    notifications: {
      appears: {
        enabled: false
      },
      disappears: {
        enabled: true
      },
      total: {
        enabled: true,
        choice: 'is greater than',
        value: 4
      }
    },
    operator: 'any',
    rules: [
      {
        field: 'Maintenance mode',
        choice: 'is on'
      },
      {
        field: 'Tag',
        choice: 'is',
        value: '1'
      }
    ]
  },
  {
    id: '2',
    title: 'Modules',
    children: [
      {
        id: '3',
        title: 'Views',
        url: 'views',
        notifications: {
          appears: {
            enabled: false
          },
          disappears: {
            enabled: false
          },
          total: {
            enabled: false,
          }
        },
        operator: 'all',
        rules: [
          {
            field: 'Module',
            choice: 'is',
            value: 'views',
            detail: 'and is available'
          },
          {
            field: 'Content type',
            choice: 'starts with',
            value: 'view_reference'
          }
        ]
      },
      {
        id: '4',
        title: 'Big webform sites',
        url: 'big-webform-sites',
        notifications: {
          appears: {
            enabled: true
          },
          disappears: {
            enabled: false
          },
          total: {
            enabled: false,
          }
        },
        operator: 'all',
        rules: [
          {
            field: 'Module',
            choice: 'contains',
            value: 'webform',
            detail: 'and is enabled'
          },
          {
            operator: 'any',
            rules: [
              {
                field: 'Number of hits in past month',
                choice: 'is greater than',
                value: 7000
              },
              {
                field: 'Number of nodes',
                choice: 'is greater than',
                value: 5000
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '5',
    title: 'Really long title to serve as an edge case for the design',
    url: 'really-long-title-to-serve-as-an-edge-case-for-the-design',
    notifications: {
      appears: {
        enabled: false
      },
      disappears: {
        enabled: false
      },
      total: {
        enabled: false,
      }
    },
  },
  {
    id: '6',
    title: 'Anotherreallylongtitlewithoutbreaksthanksjerk',
    url: 'anotherreallylongtitlewithoutbreaksthanksjerk',
    notifications: {
      appears: {
        enabled: false
      },
      disappears: {
        enabled: false
      },
      total: {
        enabled: false,
      }
    },
  }
]

newFilter = {
  notifications: {
    appears: {
      enabled: false
    },
    disappears: {
      enabled: false
    },
    total: {
      enabled: false
    }
  },
  operator: 'any',
  rules: [{
    field: 'Base URL',
    choice: 'contains',
  }]
}
