import AuthController from './AuthController.js'
import AdminController from './AdminController.js'
import db from '../db.js'


export default  {
  async findOne(...args) {
    return { 
      [this._name]: await db[this._name].findOne(...args)
    }
  },

  async find(...args) {
    return { 
      [this._namePlural]: await db[this._name].find(...args)
    }
  },

  async insertOne(...args) {
    return { 
      [this._name]: await db[this._name].insertOne(...args)
    }
  },

  async updateOne(...args) {
    return { 
      [this._name]: await db[this._name].updateOne(...args)
    }
  },

  async upsert(...args) {
    return { 
      [this._name]: await db[this._name].upsert(...args)
    }
  },

  async findAll(...args) {
    return { 
      [this._namePlural]: await db[this._name].findAll(...args)
    }
  },

  async findLike(...args) {
    return { 
      [this._namePlural]: await db[this._name].findLike(...args)
    }
  },

  async search(...args) {
    return { 
      [this._namePlural]: await db[this._name].search(...args)
    }
  },

  async searchGeo(...args) {
    return { 
      [this._namePlural]: await db[this._name].searchGeo(...args)
    }
  },

  async joinOne(...args) {
    return db[this._name].joinOne(...args)
  },

  async joinMany(...args) {
    return db[this._name].joinMany(...args)
  },

  async join(...args) {
    return db[this._name].join(...args)
  },

  async aggregate(...args) {
    return db[this._name].aggregate(...args)
  },

  async count(...args) {
    return db[this._name].count(...args)
  },

  async totalPages(...args) {
    return db[this._name].totalPages(...args)
  },

  async insertMany(...args) {
    return db[this._name].insertMany(...args)
  },

  async updateMany(...args) {
    return db[this._name].updateMany(...args)
  },

  async deleteMany(...args) {
    return db[this._name].deleteMany(...args)
  },
  
  async deleteOne(...args) {
    return db[this._name].deleteOne(...args)
  },

  async incrementOne(...args) {
    return db[this._name].incrementOne(...args)
  },

  async findOneSafe(...args) {
    return { 
      [this._name]: await db[this._name].findOneSafe(...args)
    }
  },

  async findSafe(...args) {
    return { 
      [this._namePlural]: await db[this._name].findSafe(...args)
    }
  },

  async insertOneSafe(...args) {
    return { 
      [this._name]: await db[this._name].insertOneSafe(...args)
    }
  },

  async updateOneSafe(...args) {
    return { 
      [this._name]: await db[this._name].updateOneSafe(...args)
    }
  },

  async upsertSafe(...args) {
    return { 
      [this._name]: await db[this._name].upsertSafe(...args)
    }
  },

  async findAllSafe(...args) {
    return { 
      [this._namePlural]: await db[this._name].findAllSafe(...args)
    }
  },

  async findLikeSafe(...args) {
    return { 
      [this._namePlural]: await db[this._name].findLikeSafe(...args)
    }
  },

  async searchSafe(...args) {
    return { 
      [this._namePlural]: await db[this._name].searchSafe(...args)
    }
  },

  async searchGeoSafe(...args) {
    return { 
      [this._namePlural]: await db[this._name].searchGeoSafe(...args)
    }
  },

  async joinOneSafe(...args) {
    return db[this._name].joinOneSafe(...args)
  },

  async joinManySafe(...args) {
    return db[this._name].joinManySafe(...args)
  },

  async joinSafe(...args) {
    return db[this._name].joinSafe(...args)
  },

  async aggregateSafe(...args) {
    return db[this._name].aggregateSafe(...args)
  },

  ...AuthController,
  ...AdminController,
}
