-- Partition Function: Monthly
CREATE PARTITION FUNCTION pf_WorkingStatus_ByMonth (DATETIME)
AS RANGE LEFT FOR VALUES (
    '2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01',
    '2025-06-01', '2025-07-01', '2025-08-01', '2025-09-01', '2025-10-01',
    '2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01',
    '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01',
    '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01', '2027-05-01',
    '2027-06-01', '2027-07-01', '2027-08-01', '2027-09-01', '2027-10-01',
    '2027-11-01', '2027-12-01'
);

-- Add more partipation months
ALTER PARTITION FUNCTION pf_WorkingStatus_ByMonth()
    SPLIT RANGE ('2028-01-01');

-- Partition Scheme: All to PRIMARY
CREATE PARTITION SCHEME ps_WorkingStatus_ByMonth
AS PARTITION pf_WorkingStatus_ByMonth
ALL TO ([PRIMARY]);

-- Create new table
CREATE TABLE [dbo].[ws2_working_status_partitioned](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[sensor_id] [nvarchar](20) NULL,
	[machine_id] [nvarchar](20) NULL,
	[line] [nvarchar](50) NULL,
	[status] [nvarchar](20) NULL,
	[timestamp] [datetime] NOT NULL,
 CONSTRAINT [PK_ws2_working_status_partitioned_1] PRIMARY KEY NONCLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [ps_WorkingStatus_ByMonth]([timestamp])

-- move data
INSERT INTO ws2_working_status_partitioned
SELECT * FROM ws2_working_status;

-- Optional: Backup original
--EXEC sp_rename 'ws2_working_status', 'ws2_working_status_backup';

-- Rename partitioned table
--EXEC sp_rename 'ws2_working_status_partitioned', 'ws2_working_status';