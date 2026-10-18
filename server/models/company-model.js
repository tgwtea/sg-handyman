// const mongoose = require('mongoose');
import mongoose from 'mongoose';

const companyModel = {};

const companySchema = new mongoose.Schema({
  // userId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: [true, 'Must have userId']
  // },
  name: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
});


const Company = mongoose.model('Company', companySchema, 'companies');


companyModel.findAllCompanies = function() {
  return Company.find();
};

companyModel.findCompanyById = function(companyId) {
  return Company.findById(companyId);
};


export default companyModel;