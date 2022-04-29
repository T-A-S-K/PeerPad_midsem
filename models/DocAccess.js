const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const docAccessSchema = new Schema({
    documentId: {
        type: String
    },
    ownerEmail: {
        type: String
    },
    allowedEmails: [{
        // allowedEmail:{
        type: String,
        // }
    }],
}, { timestamps: true });

const DocAccess = mongoose.model('DocAccess', docAccessSchema);
module.exports = DocAccess;