import Joi from "joi";

const requiredString = Joi.string().required();
const optionalString = Joi.string().allow("")
const money = Joi.number().default(0).min(0).optional();

export const gmirSchema = Joi.object().keys({
    member_id: requiredString,
    staff_id: requiredString,
    employer_name: requiredString,
    policy_no: requiredString,
    employee_name: requiredString,
    claim_ref: requiredString,
    patient_name: requiredString,
    relationship: requiredString,
    email: Joi.string().email().required(),
    gsm: Joi.string().required().min(10),
    date_from: Joi.date().required(),
    date_to: Joi.date().required(),
    treatment_country: Joi.string().required().regex(/[A-Z]+#[A-Za-z]+/),
    hospital_name: requiredString,
    diagnosis: requiredString.max(120),
    fr_cf: money,
    omr_cf: money,
    fr_cec: money,
    omr_cec: money,
    fr_mc: money,
    omr_mc: money,
    fr_tc: money,
    omr_tc: money,
    fr_cos: money,
    omr_cos: money,
    fr_hrr: money,
    omr_hrr: money,
    fr_sf: money,
    omr_sf: money,
    fr_cos_otr: money,
    omr_cos_otr: money,
    fr_otr: money,
    omr_otr: money,
    fr_ta: money,
    omr_ta: money,
    fr_ded: money,
    omr_ded: money,
    fr_balance: money,
    omr_balance: money,
    account_number: requiredString,
    bank_name: requiredString,
    bank_branch: requiredString,
    account_holder: requiredString,
    ip_r: optionalString,
    ip_pa: optionalString,
    ip_ds: optionalString,
    ip_pc: optionalString,
    ip_mc: optionalString,
    ip_ir: optionalString,
    op_r: optionalString,
    op_pa: optionalString,
    op_ds: optionalString,
    op_pc: optionalString,
    op_mc: optionalString,
    op_ir: optionalString,
    employee_sign: Joi.any().optional(),
    no_of_documents: Joi.number().integer().min(1).default(1),
    employer_sign_date: Joi.optional(),
    employee_sign_date: Joi.optional(),
    no_of_days: Joi.number().integer().min(0),
    rate: Joi.number(),
    currency: Joi.optional()
})