// const Blog = require('../models/blog-model');
// const User = require('../models/user-model');
// import mongoose from "mongoose";
import * as Company from '../models/company-model';

// !! fileupload import is in server.js
// const fileupload = require('express-fileupload');
// app.use(fileupload());

export async function displayCompanies (req, res) {
  try {
    let companies = await Company.getAllCompanies();

    console.log('controller', companies)

  } catch (error) {
    console.error(error);
  }
};

// async function displayCompanies (req, res) {
//   try {
//     let companies = await Company.getAllCompanies();

//   } catch (error) {
//     console.error(error);
//   }
// };
