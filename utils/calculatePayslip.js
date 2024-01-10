const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const getHolidaysInMonth = require("./getHolidaysInMonth");

const calculatePayslip = async (salaryMonth, salaryYear) => {

  const nextMonth = (salaryMonth % 12) + 1;
  // const nextYear = salaryMonth === 12 ? salaryYear + 1 : salaryYear;
  const nextYear = nextMonth === 1 ? parseInt(salaryYear) + 1 : salaryYear;

  console.log("salaryMonth: ", salaryMonth)
  console.log("salaryYear: ", salaryYear)
  console.log("nextMonth: ", nextMonth)
  console.log("nextYear: ", nextYear)

  // get all employee salary and show in payroll
  const allEmployee = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      salaryHistory: {
        orderBy: {
          id: "desc",
        },
        select: {
          id: true,
          salary: true,
        },
      },
      weeklyHoliday: true,
      shift: true,
      leaveApplication: {
        where: {
          status: "ACCEPTED",
          acceptLeaveFrom: {
            gte: new Date(`${salaryYear}-${salaryMonth}-01`),
          },
          acceptLeaveTo: {
            lte: new Date(`${nextYear}-${nextMonth}-01`),
          },
        },
      },
    },
  });

  // get working hours of each employee

  const allEmployeeWorkingHours = await prisma.attendance.findMany({
    where: {
      inTime: {
        gte: new Date(`${salaryYear}-${salaryMonth}-01`),
        lte: new Date(`${nextYear}-${nextMonth}-01`),
        // lte: new Date(`${parseInt(nextYear)}-${parseInt(nextMonth)+1}-01`),
      },
    },
    select: {
      userId: true,
      totalHour: true,
    },
  });

  // calculate work days in a month based on publicHoliday table
  const publicHoliday = await prisma.publicHoliday.count({
    where: {
      date: {
        gte: new Date(`${salaryYear}-${salaryMonth}-01`),
        lte: new Date(`${nextYear}-${nextMonth}-01`),
      },
    },
  });

  // get only the first salary of each employee from salary history
  const allEmployeeSalaryPromises = allEmployee.map(async (item) => {
    const dayInMonth = new Date(salaryYear, salaryMonth, 0).getDate();
    const shiftWiseWorkHour = parseFloat(item.shift.workHour.toFixed(2));
    const salary = item.salaryHistory[0]?.salary || 0;
    const paidLeave = item.leaveApplication
      .filter((item) => item.leaveType === "PAID")
      .reduce((acc, item) => {
        return acc + item.leaveDuration;
      }, 0);
    const unpaidLeave = item.leaveApplication
      .filter((item) => item.leaveType === "UNPAID")
      .reduce((acc, item) => {
        return acc + item.leaveDuration;
      }, 0);

    // To calculate monthly and public overlapping holidays
    const overlappingHolidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: new Date(`${salaryYear}-${salaryMonth}-01`),
          lte: new Date(`${nextYear}-${nextMonth}-01`),
        },
      },
    });

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const filteredHolidays = overlappingHolidays.filter((holiday) => {
      const dayOfWeek = new Date(holiday.date).getDay();
      const startDayIndex = daysOfWeek.indexOf(item.weeklyHoliday.startDay);
      const endDayIndex = daysOfWeek.indexOf(item.weeklyHoliday.endDay);

      return dayOfWeek >= startDayIndex && dayOfWeek <= endDayIndex;
    });

    const nonOverlappingHolidaysCount = filteredHolidays.length;
    // console.log("Overlapping Holidays Count:", nonOverlappingHolidaysCount);

    const monthlyHoliday = getHolidaysInMonth(
      salaryYear,
      salaryMonth,
      item.weeklyHoliday.startDay,
      item.weeklyHoliday.endDay
    );

    const monthlyWorkHour = parseFloat(
      (
        (dayInMonth - monthlyHoliday - nonOverlappingHolidaysCount) *
        shiftWiseWorkHour
      ).toFixed(2)
    );

    const workingDaysInMonth =
      dayInMonth - monthlyHoliday - nonOverlappingHolidaysCount;

    // Calculate total full days, half days, and absents for each user
    const userWorkingHours = allEmployeeWorkingHours.filter(
      (attendance) => attendance.userId === item.id
    );
    const totalFullDays = userWorkingHours.filter(
      (attendance) => attendance.totalHour >= 7
    ).length;
    console.log("totalFullDays", totalFullDays);
    const totalHalfDays = userWorkingHours.filter(
      (attendance) => attendance.totalHour >= 4 && attendance.totalHour < 7
    ).length;
    const totalAbsents = userWorkingHours.filter(
      (attendance) => attendance.totalHour < 4
    ).length;

    return {
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      salaryMonth: parseInt(salaryMonth),
      salaryYear: parseInt(salaryYear),
      salary: salary,
      paidLeave: paidLeave,
      unpaidLeave: unpaidLeave,
      monthlyHoliday: monthlyHoliday,
      publicHoliday: publicHoliday,
      workDay: dayInMonth - monthlyHoliday - nonOverlappingHolidaysCount,
      shiftWiseWorkHour: shiftWiseWorkHour,
      monthlyWorkHour: monthlyWorkHour,
      hourlySalary: parseFloat((salary / monthlyWorkHour).toFixed(2)),
      totalFullDays: totalFullDays,
      totalHalfDays: totalHalfDays,
      totalAbsents: workingDaysInMonth - totalFullDays - totalHalfDays,
      perDaySalary: parseFloat((salary / dayInMonth).toFixed(2)),
      bonus: 0,
      bonusComment: "",
      deduction: 0,
      deductionComment: "",
      totalPayable: 0,
    };
  });

  // Wait for all promises to resolve
  const allEmployeeSalary = await Promise.all(allEmployeeSalaryPromises);

    // sum up the total working hours of each employee
    const allEmployeeWorkingHoursSum = allEmployeeWorkingHours.reduce(
      (acc, item) => {
        if (acc[item.userId]) {
          acc[item.userId] += item.totalHour;
        } else {
          acc[item.userId] = item.totalHour;
        }
        return acc;
      },
      {}
    );

  // To calculate Salary Payable and Total Payable
  allEmployeeSalary.forEach((item) => {
    item.workingHour = parseFloat(
      (allEmployeeWorkingHoursSum[item.id] || 0).toFixed(2)
    );
    item.salaryPayable = parseFloat(
      (
        item.salary -
        (item.perDaySalary * item.totalAbsents +
          (item.perDaySalary / 2) * item.totalHalfDays)
      ).toFixed(2)
    );
    item.totalPayable = parseFloat(
      (item.salaryPayable + item.bonus - item.deduction).toFixed(2)
    );
  });

  // sort the array by id
  allEmployeeSalary.sort((a, b) => a.id - b.id);

  return allEmployeeSalary;
};

module.exports = calculatePayslip;
