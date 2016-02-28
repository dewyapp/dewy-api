exports.getFields = function() {
  return fields;
}

exports.getOperators = function() {
  return operators;
}

fields = [
  {
    title: 'Aggregate CSS',
    choices: [
      {id: 0, label: 'is off'},
      {id: 1, label: 'is on'}
    ],
    value: 'boolean'
  },
  {
    title: 'Aggregate JS',
    choices: [
      {id: 0, label: 'is off'},
      {id: 1, label: 'is on'}
    ],
    value: 'boolean'
  },
  {
    title: 'Available module',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Available theme',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Base URL',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Caching for anonymous',
    choices: [
      {id: 0, label: 'is off'},
      {id: 1, label: 'is on'}
    ],
    value: 'boolean'
  },
  {
    title: 'Content type',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Database',
    choices: [
      {id: 0, label: 'is pending updates'},
      {id: 1, label: 'is updated'}
    ],
    value: 'boolean'
  },
  {
    title: 'Database file size',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'number'
  },
  {
    title: 'Date added to Dewy',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is after', label: 'is after'},
      {id: 'is before', label: 'is before'},
      {id: 'is between', label: 'is between'},
      {id: 'is in the last', label: 'is in the last'},
      {id: 'is not in the last', label: 'is not in the last'}
    ],
    value: 'date'
  },
  {
    title: 'Date last accessed',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is after', label: 'is after'},
      {id: 'is before', label: 'is before'},
      {id: 'is between', label: 'is between'},
      {id: 'is in the last', label: 'is in the last'},
      {id: 'is not in the last', label: 'is not in the last'}
    ],
    value: 'date'
  },
  {
    title: 'Date last edited',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is after', label: 'is after'},
      {id: 'is before', label: 'is before'},
      {id: 'is between', label: 'is between'},
      {id: 'is in the last', label: 'is in the last'},
      {id: 'is not in the last', label: 'is not in the last'}
    ],
    value: 'date'
  },
  {
    title: 'Default theme',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Drupal core',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Enabled module',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Enabled theme',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'File size (private)',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'number'
  },
  {
    title: 'File size (public)',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'number'
  },
  {
    title: 'File size (db+private+public)',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'number'
  },
  {
    title: 'Maintenance mode',
    choices: [
      {id: 0, label: 'is off'},
      {id: 1, label: 'is on'}
    ],
    value: 'boolean'
  },
  {
    title: 'Module versions',
    choices: [
      {id: 0, label: 'are out-of-date'},
      {id: 1, label: 'are up-to-date'}
    ],
    value: 'boolean'
  },
  {
    title: 'Number of broken links',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of content types',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of files (private)',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of files (public)',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of files (total)',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of hits in past day',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of hits in past week',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of hits in past month',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of modules',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of nodes',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of roles',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of themes',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of users',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'Number of words',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'is greater than', label: 'is greater than'},
      {id: 'is less than', label: 'is less than'},
      {id: 'is greater than or equal to', label: 'is greater than or equal to'},
      {id: 'is less than or equal to', label: 'is less than or equal to'}
    ],
    value: 'integer'
  },
  {
    title: 'PHP version',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Role',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Tag',
    choices: [
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
    ],
    value: 'tag'
  },
  {
    title: 'Text',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Title',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'User email address',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'User name',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string'
  },
  {
    title: 'Variable',
    choices: [
      {id: 'contains', label: 'contains'},
      {id: 'does not contain', label: 'does not contain'},
      {id: 'is', label: 'is'},
      {id: 'is not', label: 'is not'},
      {id: 'starts with', label: 'starts with'},
      {id: 'ends with', label: 'ends with'}
    ],
    value: 'string',
    details: [
      'and has a setting',
      'and is true',
      'and is false'
    ]
  }
]

operators = [
  'any',
  'all',
  'none'
];
