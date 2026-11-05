import mongoose from 'mongoose';
import Company from '../models/company-model.js';

const companyController = {};

companyController.getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAllCompanies();
    res.send(companies);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load companies' });
  }
};

companyController.findCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).send({ message: 'Invalid company id' });
    }
    const company = await Company.findCompanyById(companyId);
    if (!company) {
      return res.status(404).send({ message: 'Company not found' });
    }
    res.send(company);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load company' });
  }
};

export default companyController;
