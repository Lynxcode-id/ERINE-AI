import mongoose from 'mongoose';

const { Schema, connect, model: _model, models } = mongoose;

mongoose.set('strictQuery', false);

const MONGOOSE_OPTS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export class mongoDB {
  constructor(url, options = {}) {
    this.url = url;
    this.options = { ...MONGOOSE_OPTS, ...options };
    this.data = {};
    this._data = null;
    this._model = null;
    this.db = null;
    this.isWriting = false;
    this.writeQueue = [];

    this._connect();
  }

  _connect() {
    if (!this.db) {
      this.db = connect(this.url, this.options).catch(e => {
        console.error('[MongoDB] Koneksi Error:', e.message);
        this.db = null;
      });
    }
    return this.db;
  }

  async read() {
    await this._connect();
    if (this._model) return this.data;

    const schema = new Schema({
      data: { type: Object, required: true, default: {} }
    }, { minimize: false });

    this._model = models.data || _model('data', schema);

    await this._model.createIndexes({ _id: 1 }).catch(() => {});

    this._data = await this._model.findOne({}).lean();

    if (!this._data) {
      this.data = {};
      await this.write(this.data);
      this._data = await this._model.findOne({}).lean();
    } else {
      this.data = this._data.data || {};
    }

    return this.data;
  }

  write(data) {
    if (this.isWriting) {
      return new Promise((resolve, reject) => {
        this.writeQueue.push({ data, resolve, reject });
      });
    }
    return this._writeInternal(data);
  }

  async _writeInternal(data) {
    this.isWriting = true;
    try {
      await this._connect();
      if (!this._model) await this.read();
      const res = await this._model.findOneAndUpdate(
        {},
        { $set: { data } },
        { upsert: true, new: true, lean: true }
      );
      this.data = res.data;
      this._data = res;

      while (this.writeQueue.length > 0) {
        const { data: queueData, resolve, reject } = this.writeQueue.shift();
        try {
          await this._model.findOneAndUpdate({}, { $set: { data: queueData } }, { upsert: true });
          this.data = queueData;
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    } finally {
      this.isWriting = false;
    }
  }
}

export class mongoDBV2 {
  constructor(url, options = {}) {
    this.url = url;
    this.options = { ...MONGOOSE_OPTS, ...options };
    this.models = [];
    this.data = {};
    this.list = null;
    this.lists = null;
    this.db = null;
    this._connect();
  }

  _connect() {
    if (!this.db) {
      this.db = connect(this.url, this.options).catch(e => {
        console.error('[MongoDB V2] Koneksi Error:', e.message);
        this.db = null;
      });
    }
    return this.db;
  }

  async read() {
    await this._connect();
    if (this.lists) return this.data;

    const schema = new Schema({ data: [{ name: String }] });
    this.list = models.lists || _model('lists', schema);
    await this.list.createIndexes({ _id: 1 }).catch(() => {});

    this.lists = await this.list.findOne({}).lean();
    if (!this.lists?.data) {
      await this.list.create({ data: [] });
      this.lists = await this.list.findOne({}).lean();
    }

    const garbage = [];
    this.data = {};

    await Promise.all(
      this.lists.data.map(async ({ name }) => {
        let collection;
        try {
          const colSchema = new Schema({
            key: { type: String, unique: true },
            value: Schema.Types.Mixed
          });
          await _model(name, colSchema).createIndexes({ key: 1 }).catch(() => {});
          collection = models[name] || _model(name, colSchema);
        } catch (e) {
          console.error('[MongoDB V2] Model Error:', e);
          garbage.push(name);
          return;
        }

        const index = this.models.findIndex(v => v.name === name);
        if (index !== -1) this.models[index].model = collection;
        else this.models.push({ name, model: collection });

        const docs = await collection.find({}).lean();
        this.data[name] = Object.fromEntries(docs.map(v => [v.key, v.value]));
      })
    );

    if (garbage.length > 0) {
      await this.list.updateOne({}, { $pull: { data: { name: { $in: garbage } } } });
    }

    return this.data;
  }

  async write(data) {
    await this._connect();
    if (!this.lists || !data) throw new Error('List atau data tidak valid');

    const collections = Object.keys(data);
    const listDoc = [];

    await Promise.all(
      collections.map(async (key) => {
        let modelEntry = this.models.find(v => v.name === key);

        if (!modelEntry) {
          const colSchema = new Schema({
            key: { type: String, unique: true },
            value: Schema.Types.Mixed
          });
          const doc = models[key] || _model(key, colSchema);
          await doc.createIndexes({ key: 1 }).catch(() => {});
          modelEntry = { name: key, model: doc };
          this.models.push(modelEntry);
        }

        const bulkOps = Object.entries(data[key]).map(([k, v]) => ({
          updateOne: {
            filter: { key: k },
            update: { $set: { key: k, value: v } },
            upsert: true
          }
        }));

        const existingKeys = await modelEntry.model.distinct('key');
        const newKeys = Object.keys(data[key]);
        const toDelete = existingKeys.filter(k => !newKeys.includes(k));

        if (toDelete.length > 0) {
          bulkOps.push({ deleteMany: { filter: { key: { $in: toDelete } } } });
        }

        if (bulkOps.length > 0) await modelEntry.model.bulkWrite(bulkOps);
        listDoc.push({ name: key });
      })
    );

    await this.list.updateOne({}, { $set: { data: listDoc } }, { upsert: true });
    this.lists.data = listDoc;
  }
}
