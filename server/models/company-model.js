// const mongoose = require('mongoose');
import { Int32 } from 'mongodb';
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
  },
  website: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  services: {
    type: [
      {
        category: {
          type: String
        },
        details: {
          type: [
            {
              service: {
                type: String
              },
              startingPrice: {
                type: Int32
              }
            }
          ]
        } 
      }
    ],
    default: []
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