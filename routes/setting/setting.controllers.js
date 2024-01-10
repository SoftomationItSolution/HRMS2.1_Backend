const prisma = require("../../utils/prisma");

const addOffice = async (req, res) => {
  try {
    const newOffice = await prisma.appSetting.create({
      data: { ...req.body },
    });
    return res.status(201).json(newOffice);
  } catch (error) {
    return res.status(400).json(error.message);
  }
};

// const updateSetting = async (req, res) => {
//   try {
//     const updatedSetting = await prisma.appSetting.update({
//       where: {
//         id: 1,
//       },
//       data: { ...req.body },
//     });
//     return res.status(200).json(updatedSetting);
//   } catch (error) {
//     return res.status(400).json(error.message);
//   }
// };

const updateSetting = async (req, res) => {
  try {
    const officeId = req.params.id; // Extracting office ID from the request parameters

    const updatedSetting = await prisma.appSetting.update({
      where: {
        id: parseInt(officeId), // Make sure to convert the ID to an integer if it's a string
      },
      data: {
        company_name: req.body.company_name,
        tag_line: req.body.tag_line,
        address: req.body.address,
        phone: req.body.phone,
        email: req.body.email,
        website: req.body.website,
        footer: req.body.footer,
      },
    });

    return res.status(200).json(updatedSetting);
  } catch (error) {
    return res.status(400).json(error.message);
  }
};


// const updateSetting = async (req, res) => {
//   try {
//     const officeId = req.params.id; // Extracting office ID from the request parameters

//     const updatedSetting = await prisma.appSetting.update({
//       where: {
//         id: parseInt(officeId), // Convert office ID to an integer (assuming it's stored as an integer in the database)
//       },
//       data: { ...req.body },
//     });

//     return res.status(200).json(updatedSetting);
//   } catch (error) {
//     return res.status(400).json(error.message);
//   }
// };


const getSetting = async (req, res) => {
  try {
    const newSetting = await prisma.appSetting.findMany();
    return res.status(201).json(newSetting);
  } catch (error) {
    return res.status(400).json(error.message);
  }
};

const addOfficeLocation = async (req, res) => {
  try {
    const newLocation = await prisma.officeArea.create({
      data: { ...req.body },
    });
    return res.status(201).json(newLocation);
  } catch (error) {
    return res.status(400).json(error.message);
  }
};


const getOfficeLocation = async (req, res) => {
  try {
    const allLocation = await prisma.officeArea.findMany();
    return res.status(201).json(allLocation);
  } catch (error) {
    return res.status(400).json(error.message);
  }
};



module.exports = {
  addOffice,
  updateSetting,
  getSetting,
  addOfficeLocation,
  getOfficeLocation
};
