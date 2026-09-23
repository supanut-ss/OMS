CREATE OR ALTER VIEW inv.v_inv_label_master_item
AS
	SELECT item_master_id
		 , item_number
		 , description
		 , item_category
		 , is_active
	FROM inv.t_inv_item
GO

CREATE OR ALTER VIEW inv.v_inv_label_master_location
AS
	SELECT location_id
		 , location
		 , description
		 , is_active
	FROM inv.t_inv_location
GO

CREATE OR ALTER VIEW inv.v_inv_label_inbound_item
AS
	SELECT inbound_master_id
		 , inbound_order_number
		 , inbound_detail_id
		 , line_number
		 , item_number
		 , item_description
		 , item_uom_id
		 , uom
		 , lot_number
		 , expiry_date
		 , serial_number
	FROM inv.t_inv_inbound_detail

GO