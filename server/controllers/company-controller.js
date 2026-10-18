// const Blog = require('../models/blog-model');
// const User = require('../models/user-model');
// const mongoose = require('mongoose');
import mongoose from 'mongoose';
import Company from '../models/company-model.js';

const companyController = {};

// !! fileupload import is in server.js
// const fileupload = require('express-fileupload');
// app.use(fileupload());

companyController.getCompanies = async (req, res) => {
  try {
    let companies = await Company.findAllCompanies();
    // console.log('controller', companies)
    res.send(companies);
  } catch (error) {
    console.error(error);
  }
};

companyController.findCompanyById = async (req, res) => {
  try {
    let companyId = req.params.companyId;
    let _id = new mongoose.Types.ObjectId(companyId);
    let company = await Company.findCompanyById(_id);
    // console.log('controller', company)
    res.send(company);
  } catch (error) {
    console.error(error);
  }
}


export default companyController;