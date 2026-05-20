import React from 'react';
import CrudPage from '../components/CrudPage';
import { shiftRosterApi } from '../services/api';

const fields = [
  { name: 'entry_id',    label: 'Entry ID',    kind: 'text' },
  { name: 'analyst',     label: 'Analyst',     kind: 'text', required: true },
  { name: 'shift',       label: 'Shift',       kind: 'text', options: ['Day','Evening','Night'] },
  { name: 'day_of_week', label: 'Day',         kind: 'text', options: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
  { name: 'on_call',     label: 'On Call',     kind: 'bool' },
  { name: 'id',          label: '#',           kind: 'text', hideInTable: true, hideInForm: true },
];

const emptyRow = { entry_id: '', analyst: '', shift: 'Day', day_of_week: 'Monday', on_call: false };

export default function ShiftRosterPage() {
  return (
    <CrudPage
      title="Shift Roster"
      description="Analyst rotation across shifts plus on-call coverage."
      api={shiftRosterApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
