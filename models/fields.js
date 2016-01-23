exports.getFields = function() {
  // Dummy function for now, will eventually pull from persistence layer
  return fields;
}

exports.getOperators = function() {
  // Dummy function for now, will eventually pull from persistence layer
  return operators;
}

fields = [
  {
    title: 'Aggregate CSS',
    choices: [
      'is on',
      'is not on'
    ],
    value: false
  },
  {
    title: 'Aggregate JS',
    choices: [
      'is on',
      'is not on'
    ],
    value: false
  },
  {
    title: 'Base URL',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'Caching for anonymous',
    choices: [
      'is on',
      'is not on'
    ],
    value: false
  },
  {
    title: 'Content type',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'Database',
    choices: [
      'is pending updates',
      'is updated'
    ],
    value: false
  },
  {
    title: 'Database file size',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Date added to Dewy',
    choices: [
      'is',
      'is not',
      'is after',
      'is before',
      'is in the last',
      'is not in the last'
    ],
    value: 'date'
  },
  {
    title: 'Date last accessed',
    choices: [
      'is',
      'is not',
      'is after',
      'is before',
      'is in the last',
      'is not in the last'
    ],
    value: 'date'
  },
  {
    title: 'Date last edited',
    choices: [
      'is',
      'is not',
      'is after',
      'is before',
      'is in the last',
      'is not in the last'
    ],
    value: 'date'
  },
  {
    title: 'Drupal core',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'File size (private)',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'File size (public)',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'File size (db+private+public)',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Maintenance mode',
    choices: [
      'is on',
      'is not on'
    ],
    value: false
  },
  {
    title: 'Module',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string',
    details: [
      'and is available',
      'and is enabled',
      'and is disabled'
    ]
  },
  {
    title: 'Modules',
    choices: [
      'are up-to-date',
      'are out-of-date'
    ],
    value: false
  },
  {
    title: 'Number of broken links',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of content types',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of files (private)',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of files (public)',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of files (total)',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of hits in past day',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of hits in past week',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of hits in past month',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of modules',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of nodes',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of roles',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of themes',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'Number of users',
    choices: [
      'is',
      'is not',
      'is greater than',
      'is less than',
      'is greater than or equal to',
      'is less than or equal to'
    ],
    value: 'integer'
  },
  {
    title: 'PHP version',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'Role',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'Tag',
    choices: [
      'is',
      'is not'
    ],
    value: 'tag'
  },
  {
    title: 'Text',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'Theme',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string',
    details: [
      'and is available',
      'and is default',
      'and is enabled',
      'and is disabled'
    ]
  },
  {
    title: 'Title',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'User email address',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'User name',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
    ],
    value: 'string'
  },
  {
    title: 'Variable',
    choices: [
      'contains',
      'does not contain',
      'is',
      'is not',
      'starts with',
      'ends with'
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
