const { gateDefsFromRaw, errorDefsFromRaw, successDefsFromRaw, makeSchema } = require('@godbliss/core/utils');

// Schema for testing
const userSchema = makeSchema({
  name: { type: String, required: true },
  email: { type: String, required: true, regEx: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  age: { type: Number, min: 0, max: 150, optional: true }
});

const postSchema = makeSchema({
  title: { type: String, required: true, max: 200 },
  content: { type: String, required: true, max: 5000 },
  authorId: { type: String, required: true }
});

// Domain-specific action definitions (reflects ACTION_DEFS_STRUCTURE.md)
const userActionDefs = {
  createUser: {
    gating: { path: '/users/', method: 'POST' },
    confirmAction: {
      title: 'Create User',
      message: 'Do you want to create this user?',
      confirmText: 'Create',
      cancelText: 'Cancel'
    },
    alertSuccess: {
      title: 'Creation Complete',
      message: 'User has been created.'
    },
    alertValidationError: {
      title: 'Input Error',
      message: 'Please check the required fields.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack(),
    invalidateQueriesOnSuccess: { queryKey: ['users'] }
  },
  updateUser: {
    gating: { path: '/users/:userId', method: 'PUT' },
    confirmAction: {
      title: 'Update User',
      message: 'Do you want to update this user?'
    },
    alertSuccess: {
      title: 'Update Complete',
      message: 'User has been updated.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack(),
    invalidateQueriesOnSuccess: { queryKey: ['users'] }
  },
  deleteUser: {
    gating: { path: '/users/:userId', method: 'DELETE' },
    confirmAction: {
      title: 'Delete User',
      message: 'Are you sure you want to delete?',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    },
    alertSuccess: {
      title: 'Delete Complete',
      message: 'User has been deleted.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack(),
    invalidateQueriesOnSuccess: { queryKey: ['users'] }
  }
};

const postActionDefs = {
  createPost: {
    gating: { path: '/posts/', method: 'POST' },
    confirmAction: {
      title: 'Create Post',
      message: 'Do you want to create this post?'
    },
    alertSuccess: {
      title: 'Creation Complete',
      message: 'Post has been created.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack(),
    invalidateQueriesOnSuccess: { queryKey: ['posts'] }
  },
  updatePost: {
    gating: { path: '/posts/:postId', method: 'PUT' },
    confirmAction: {
      title: 'Update Post',
      message: 'Do you want to update this post?'
    },
    alertSuccess: {
      title: 'Update Complete',
      message: 'Post has been updated.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack(),
    invalidateQueriesOnSuccess: { queryKey: ['posts'] }
  },
  deletePost: {
    gating: { path: '/posts/:postId', method: 'DELETE' },
    confirmAction: {
      title: 'Delete Post',
      message: 'Are you sure you want to delete?',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    },
    alertSuccess: {
      title: 'Delete Complete',
      message: 'Post has been deleted.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack(),
    invalidateQueriesOnSuccess: { queryKey: ['posts'] }
  },
  publishPost: {
    gating: { path: '/posts/:postId/publish', method: 'POST' },
    confirmAction: {
      title: 'Publish Post',
      message: 'Do you want to publish this post?'
    },
    alertSuccess: {
      title: 'Publish Complete',
      message: 'Post has been published.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack(),
    invalidateQueriesOnSuccess: { queryKey: ['posts'] }
  }
};

const otherActionDefs = {
  // User + Post composite action
  createUserWithPost: {
    gating: { path: '/users-with-post/', method: 'POST' },
    confirmAction: {
      title: 'Create User and Post',
      message: 'Do you want to create a user with the first post?'
    },
    alertSuccess: {
      title: 'Creation Complete',
      message: 'User and post have been created.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack(),
    invalidateQueriesOnSuccess: { queryKey: ['users', 'posts'] }
  },

  // System-wide action
  systemBackup: {
    gating: { path: '/system/backup', method: 'POST' },
    confirmAction: {
      title: 'System Backup',
      message: 'Do you want to backup the system?'
    },
    alertSuccess: {
      title: 'Backup Complete',
      message: 'System backup has been completed.'
    },
    goOnSuccess: ({ navigation }) => navigation.goBack()
  },

  // Temporary/experimental action
  experimentalFeature: {
    gating: { path: '/experimental/', method: 'POST' },
    confirmAction: {
      title: 'Experimental Feature',
      message: 'Do you want to use this experimental feature?'
    },
    alertSuccess: {
      title: 'Execution Complete',
      message: 'Experimental feature has been executed.'
    }
  }
};

// Combined actionDefs (ACTION_DEFS_STRUCTURE.md structure)
const actionDefs = {
  ...userActionDefs,
  ...postActionDefs,
  ...otherActionDefs
};

// Terminal definition for testing
const terminalDef = {
  gateDefs: gateDefsFromRaw({
    '/users': {
      '/': {
        POST: {
          schema: userSchema
        }
      },
      '/:userId': {
        PUT: {
          schema: userSchema
        },
        DELETE: {
          schema: userSchema
        }
      }
    },
    '/posts': {
      '/': {
        POST: {
          schema: postSchema
        }
      },
      '/:postId': {
        PUT: {
          schema: postSchema
        },
        DELETE: {
          schema: postSchema
        }
      },
      '/:postId/publish': {
        POST: {
          schema: postSchema
        }
      }
    },
    '/users-with-post': {
      '/': {
        POST: {
          schema: userSchema
        }
      }
    },
    '/system': {
      '/backup': {
        POST: {
          errorSpec: {
            'system.internalError': { code: 500, message: 'Backup failed' }
          }
        }
      }
    },
    '/experimental': {
      '/': {
        POST: {
          errorSpec: {
            'system.internalError': { code: 500, message: 'Experimental feature failed' }
          }
        }
      }
    }
  }),
  errorDefs: errorDefsFromRaw({
    request: {
      bad: { code: 400, message: 'Bad Request' },
      validationError: ({ error }) => ({ code: 400, message: 'Validation Error', details: error })
    },
    system: {
      gateNotFound: { code: 404, message: 'Gate Not Found' },
      internalError: { code: 500, message: 'Internal Server Error' }
    }
  }),
  successDefs: successDefsFromRaw({
    response: {
      ok: { code: 200, message: 'OK' }
    },
    user: {
      created: { code: 201, message: 'User Created' },
      updated: { code: 200, message: 'User Updated' },
      deleted: { code: 200, message: 'User Deleted' }
    },
    post: {
      created: { code: 201, message: 'Post Created' },
      updated: { code: 200, message: 'Post Updated' },
      deleted: { code: 200, message: 'Post Deleted' },
      published: { code: 200, message: 'Post Published' }
    }
  })
};

module.exports = {
  actionDefs,
  userActionDefs,
  postActionDefs,
  otherActionDefs,
  terminalDef,
  userSchema,
  postSchema
};
