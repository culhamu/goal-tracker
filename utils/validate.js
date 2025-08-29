'use strict';

function isEmail(v){ return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isIsoDate(v){ return typeof v === 'string' && !Number.isNaN(Date.parse(v)); }
function isString(v){ return typeof v === 'string'; }

function validate(schema, obj) {
  for (const [k, rule] of Object.entries(schema)) {
    const v = obj[k];
    if (rule.required && (v === undefined || v === null || v === '')) {
      return { ok:false, error:`Missing field: ${k}` };
    }
    if (v === undefined || v === null) continue;
    if (rule.type === 'email' && !isEmail(v)) return { ok:false, error:`Invalid email: ${k}` };
    if (rule.type === 'string' && !isString(v)) return { ok:false, error:`Expected string: ${k}` };
    if (rule.type === 'date' && !isIsoDate(v)) return { ok:false, error:`Invalid date: ${k}` };
    if (rule.min != null && typeof v === 'number' && v < rule.min) return { ok:false, error:`${k} < min` };
    if (rule.max != null && typeof v === 'number' && v > rule.max) return { ok:false, error:`${k} > max` };
    if (rule.enum && !rule.enum.includes(v)) return { ok:false, error:`Invalid enum for ${k}` };
  }
  return { ok:true };
}

const listQuery = {
  page: { type:'number' }, limit: { type:'number' }, sort: { type:'string' },
  from: { type:'date' }, to: { type:'date' }, q: { type:'string' }
};

function sanitizeListQuery(q) {
  const page = Math.max(1, parseInt(q.page || '1', 10));
  let limit = Math.max(1, parseInt(q.limit || '50', 10));
  limit = Math.min(limit, 500);
  const sort = typeof q.sort === 'string' ? q.sort : '-createdAt';
  const out = {
    page, limit, sort,
    from: q.from && isIsoDate(q.from) ? q.from : null,
    to: q.to && isIsoDate(q.to) ? q.to : null,
    q: typeof q.q === 'string' ? q.q.slice(0,128) : null
  };
  return out;
}

const schemas = {
  register: { email:{required:true,type:'email'}, password:{required:true,type:'string'}, role:{type:'string'} },
  login: { email:{required:true,type:'email'}, password:{required:true,type:'string'} },

  vitalCreate: {
    heartRate:{type:'number', min:20, max:250},
    systolic:{type:'number', min:60, max:250},
    diastolic:{type:'number', min:30, max:180},
    spo2:{type:'number', min:50, max:100},
    temperature:{type:'number', min:30, max:45},
    mood:{type:'string'},
    note:{type:'string'},
    createdAt:{type:'date'}
  },

  workoutCreate: {
    type:{required:true,type:'string'},
    durationMin:{required:true}, calories:{}, distanceKm:{}, intensity:{type:'string'},
    note:{type:'string'}, startedAt:{required:true,type:'date'}
  },

  sleepCreate: {
    start:{required:true,type:'date'}, end:{required:true,type:'date'},
    quality:{}, awakenings:{}, note:{type:'string'}
  },

  mealCreate: {
    whenAt:{required:true,type:'date'},
    mealType:{type:'string'},
    calories:{}, protein:{}, carbs:{}, fat:{}, note:{type:'string'}
  },

  measureCreate: {
    weightKg:{}, bodyFatPct:{}, waistCm:{}, hipCm:{}, note:{type:'string'}, createdAt:{type:'date'}
  },

  goalCreate: {
    title:{required:true,type:'string'}, metric:{type:'string'}, target:{}, dueDate:{type:'date'}
  },

  reminderCreate: {
    title:{required:true,type:'string'}, at:{required:true,type:'date'}, repeatRule:{type:'string'}, note:{type:'string'}
  }
};

module.exports = { validate, sanitizeListQuery, schemas };
