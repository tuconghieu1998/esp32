use ESP32

EXEC sp_helpindex 'ws2_working_status';

CREATE NONCLUSTERED INDEX IX_ws2_working_status1
ON ws2_working_status(machine_id, timestamp);

CREATE NONCLUSTERED INDEX IX_ws2_working_status2
ON ws2_working_status(timestamp)
INCLUDE (sensor_id, machine_id, line, status);

ALTER INDEX IX_ws2_working_status1
ON dbo.ws2_working_status
REBUILD;

ALTER INDEX IX_ws2_working_status2
ON dbo.ws2_working_status
REBUILD;