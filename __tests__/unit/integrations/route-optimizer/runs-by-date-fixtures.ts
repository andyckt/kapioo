export const emptyRunsByDateResponse = {
  status: "success",
  date: "2026-05-31",
  timezone_note: "America/Toronto",
  count: 0,
  runs: [],
  metadata: {
    queried_at: "2026-06-01T12:00:00.000Z",
  },
  warnings: [],
};

export const oneRunOneStopResponse = {
  status: "success",
  date: "2026-05-31",
  timezone_note: "America/Toronto",
  count: 1,
  runs: [
    {
      run_id: "run-abc123",
      run_date: "2026-05-31",
      driver_name: "DT",
      status: "completed",
      start_location: "Kitchen",
      end_location: "Kitchen",
      start_time: "10:00",
      actual_start_time: "2026-05-31T14:00:00.000Z",
      run_completed_at: "2026-05-31T16:30:00.000Z",
      travel_mode: "driving",
      planning_session_id: "planning-session-1",
      external_id: "kapioo-final-run:2026-05-31:1",
      idempotency_key: "daily-delivery-agent:2026-05-31:final:1",
      created_by_integration: "kapioo-admin",
      created_at: "2026-05-31T13:00:00.000Z",
      updated_at: "2026-05-31T16:30:00.000Z",
      eta_basis: "post_start",
      route: {
        total_distance_km: 42.5,
        total_duration_minutes: 95,
      },
      optimization_controls: {
        start_location: "Kitchen",
        end_location: "Kitchen",
      },
      stops: [
        {
          sequence: 0,
          customer_index: 0,
          customer_name: "Donald-1111",
          customer_phone: "4379891111",
          customer_address: "123 Main St, Toronto",
          notes: null,
          lat: 43.65,
          lng: -79.38,
          order_ids: ["DD-90000001"],
          is_synthetic: false,
          stop_type: "customer",
          is_first_stop: false,
          is_end_point: false,
          fixed_stop_position: null,
          eta: "2:15 PM",
          arrival_time: "2026-05-31T18:15:00.000Z",
          eta_basis: "post_start",
          completed: true,
          completed_at: "2026-05-31T18:22:00.000Z",
          status: "completed",
        },
      ],
      customers: [
        {
          customer_index: 0,
          name: "Donald-1111",
          phone: "4379891111",
          address: "123 Main St, Toronto",
          notes: null,
          lat: 43.65,
          lng: -79.38,
          order_ids: ["DD-90000001"],
          fixed_stop_position: null,
          is_first_stop: false,
          is_end_point: false,
          is_synthetic: false,
          stop_type: "customer",
        },
      ],
      future_ro_field: "preserved",
    },
  ],
  metadata: {
    queried_at: "2026-06-01T12:00:00.000Z",
  },
  warnings: ["Sample warning"],
};

export const plannedEtaBasisResponse = {
  ...oneRunOneStopResponse,
  runs: [
    {
      ...oneRunOneStopResponse.runs[0],
      eta_basis: "planned",
      actual_start_time: null,
      stops: [
        {
          ...oneRunOneStopResponse.runs[0].stops[0],
          eta_basis: "planned",
          completed: false,
          completed_at: null,
        },
      ],
    },
  ],
};
